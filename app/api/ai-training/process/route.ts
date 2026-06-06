import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { geminiText } from "@/lib/gemini-text";
import { generateEmbedding, chunkText } from "@/lib/embeddings";

export const maxDuration = 60;

const BUCKET = "ai-training-sources";

interface ProcessBody {
  type: "text" | "link" | "file_pdf" | "file_audio" | "file_video" | "carousel";
  title?: string;
  text?: string;          // for type=text or type=carousel (JSON stringified)
  url?: string;           // for type=link
  storagePath?: string;   // for file types
}

// ── Text extraction helpers ─────────────────────────────────────────────────

async function extractFromLink(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; XPost/1.0)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Não foi possível acessar a URL: ${res.statusText}`);
  const html = await res.text();
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim()
    .substring(0, 20000);
}

async function extractFromPDF(buffer: Buffer): Promise<string> {
  const base64 = buffer.toString("base64");
  const prompt = "Extract all readable text from this PDF document. Return only the text content, organized by sections if present. Remove headers/footers/page numbers. Keep the main content intact.";

  const keys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2].filter(Boolean) as string[];
  if (!keys.length) throw new Error("GEMINI_API_KEY não configurada");

  for (const key of keys) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType: "application/pdf", data: base64 } },
              { text: prompt },
            ],
          }],
          generationConfig: { temperature: 0, maxOutputTokens: 4096 },
        }),
      }
    );
    const data = await res.json();
    if (res.ok) {
      const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      if (text) return text;
    }
  }
  throw new Error("Não foi possível extrair texto do PDF");
}

async function transcribeWithWhisper(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) throw new Error("OPENAI_API_KEY não configurada para transcrição de áudio");

  const form = new FormData();
  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  form.append("file", new File([ab], filename, { type: mimeType }));
  form.append("model", "whisper-1");
  form.append("response_format", "text");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openaiKey}` },
    body: form,
  });

  const text = await res.text();
  if (!res.ok) {
    const data = JSON.parse(text);
    throw new Error(data.error?.message ?? `Whisper error ${res.status}`);
  }
  return text.trim();
}

function extractCarouselText(jsonStr: string): string {
  try {
    const slides: any[] = JSON.parse(jsonStr);
    return slides
      .map(slide => {
        const texts: string[] = [];
        slide.elements?.forEach((el: any) => {
          if (el.type === "text" && el.content) texts.push(el.content);
        });
        return texts.join(" ");
      })
      .join("\n\n");
  } catch {
    return jsonStr;
  }
}

// ── AI analysis ─────────────────────────────────────────────────────────────

interface AnalysisResult {
  summary: string;
  topics: string[];
  keywords: string[];
  tone: string;
  target_audience: string;
  processed_text: string;
}

async function analyzeContent(rawText: string, title: string): Promise<AnalysisResult> {
  const prompt = `Analise o seguinte conteúdo e extraia informações estruturadas para uma base de conhecimento de IA.

TÍTULO: ${title}
CONTEÚDO:
${rawText.substring(0, 5000)}

Retorne APENAS este JSON válido, sem markdown:
{
  "summary": "resumo em 2-3 frases impactantes sobre o conteúdo",
  "topics": ["tópico principal 1", "tópico 2", "tópico 3"],
  "keywords": ["palavra1", "palavra2", "palavra3", "palavra4", "palavra5"],
  "tone": "tom de voz detectado (ex: formal, informal, técnico, motivacional, direto, storytelling)",
  "target_audience": "público-alvo identificado ou estimado (ex: empreendedores iniciantes, profissionais de marketing)",
  "processed_text": "versão limpa e organizada do conteúdo — remova ruídos, anúncios e irrelevâncias, mantenha essencialmente o conteúdo principal com clareza"
}`;

  const raw = await geminiText(prompt, { temperature: 0.3, maxTokens: 2000 });

  try {
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(clean);
    return {
      summary:        parsed.summary        ?? "",
      topics:         Array.isArray(parsed.topics) ? parsed.topics : [],
      keywords:       Array.isArray(parsed.keywords) ? parsed.keywords : [],
      tone:           parsed.tone           ?? "",
      target_audience: parsed.target_audience ?? "",
      processed_text: parsed.processed_text ?? rawText,
    };
  } catch {
    return {
      summary:        rawText.substring(0, 200) + "...",
      topics:         [],
      keywords:       [],
      tone:           "",
      target_audience: "",
      processed_text: rawText,
    };
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  let body: ProcessBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { type, title: rawTitle, text, url, storagePath } = body;

  if (!type) return NextResponse.json({ error: "Campo 'type' obrigatório" }, { status: 400 });

  // Create a "processing" record immediately so UI can show progress
  const { data: sourceRow, error: insertErr } = await supabaseAdmin
    .from("ai_training_sources")
    .insert({
      user_email: email,
      source_type: type,
      title: rawTitle || url || "Sem título",
      status: "processing",
    })
    .select()
    .single();

  if (insertErr || !sourceRow) {
    return NextResponse.json({ error: insertErr?.message ?? "Erro ao criar registro" }, { status: 500 });
  }

  const sourceId = sourceRow.id as string;

  const fail = async (msg: string) => {
    await supabaseAdmin
      .from("ai_training_sources")
      .update({ status: "error", error_msg: msg })
      .eq("id", sourceId);
    return NextResponse.json({ error: msg }, { status: 500 });
  };

  try {
    // ── 1. Extract raw text ──────────────────────────────────────────────────
    let rawText = "";
    let fileUrl: string | undefined;

    if (type === "text") {
      if (!text?.trim()) return fail("Texto não pode ser vazio");
      rawText = text.trim();
    }

    else if (type === "link") {
      if (!url?.trim()) return fail("URL não pode ser vazia");
      rawText = await extractFromLink(url.trim());
    }

    else if (type === "carousel") {
      if (!text?.trim()) return fail("Dados do carrossel não fornecidos");
      rawText = extractCarouselText(text.trim());
    }

    else if (type === "file_pdf" || type === "file_audio" || type === "file_video") {
      if (!storagePath) return fail("storagePath é obrigatório para arquivos");

      const { data: fileData, error: dlErr } = await supabaseAdmin.storage
        .from(BUCKET)
        .download(storagePath);

      if (dlErr || !fileData) return fail(dlErr?.message ?? "Arquivo não encontrado no storage");

      const buffer = Buffer.from(await fileData.arrayBuffer());
      const filename = storagePath.split("/").pop() ?? "file";
      const ext = filename.split(".").pop()?.toLowerCase() ?? "";

      // Get public URL for reference
      const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath);
      fileUrl = urlData?.publicUrl;

      if (type === "file_pdf") {
        rawText = await extractFromPDF(buffer);
      } else {
        const EXT_MIME: Record<string, string> = {
          mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/m4a",
          ogg: "audio/ogg", mp4: "video/mp4", mov: "video/quicktime",
          webm: "video/webm",
        };
        const mimeType = EXT_MIME[ext] ?? "audio/mpeg";
        rawText = await transcribeWithWhisper(buffer, filename, mimeType);
      }
    }

    if (!rawText.trim()) return fail("Não foi possível extrair texto do conteúdo");

    // ── 2. Analyze with AI ──────────────────────────────────────────────────
    const title = rawTitle?.trim() || url || "Material de treino";
    const analysis = await analyzeContent(rawText, title);
    const cleanText = analysis.processed_text || rawText;

    // ── 3. Chunk + embed ────────────────────────────────────────────────────
    const chunks = chunkText(cleanText, 400, 60);
    const chunkRows: {
      user_email: string; source_id: string;
      chunk_text: string; embedding: string; metadata: object;
    }[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await generateEmbedding(chunks[i]);
      chunkRows.push({
        user_email: email,
        source_id:  sourceId,
        chunk_text: chunks[i],
        embedding:  JSON.stringify(embedding),
        metadata:   { chunkIndex: i, totalChunks: chunks.length, title },
      });
    }

    if (chunkRows.length > 0) {
      const { error: chunkErr } = await supabaseAdmin
        .from("ai_training_chunks")
        .insert(chunkRows);
      if (chunkErr) throw new Error(`Erro ao salvar chunks: ${chunkErr.message}`);
    }

    // ── 4. Update source record ─────────────────────────────────────────────
    const { data: updated } = await supabaseAdmin
      .from("ai_training_sources")
      .update({
        title,
        original_file_url: fileUrl,
        original_text: rawText.substring(0, 10000),
        processed_text: cleanText.substring(0, 10000),
        summary: analysis.summary,
        topics: analysis.topics,
        keywords: analysis.keywords,
        tone: analysis.tone,
        target_audience: analysis.target_audience,
        status: "done",
        chunk_count: chunkRows.length,
      })
      .eq("id", sourceId)
      .select()
      .single();

    return NextResponse.json({ ok: true, source: updated });
  } catch (err: any) {
    console.error("[ai-training/process]", err.message);
    return fail(err.message ?? "Erro no processamento");
  }
}
