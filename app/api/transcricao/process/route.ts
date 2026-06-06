import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { redisSet, redisLPush, redisLTrim } from "@/lib/redis";
import { geminiText } from "@/lib/gemini-text";
import { randomUUID } from "crypto";

export const maxDuration = 60;

const BUCKET = "schedule-images";

export interface TranscriptionRecord {
  id: string;
  email: string;
  title: string;
  sourceType: "upload" | "url";
  filePath?: string;
  sourceUrl?: string;
  transcript: string;
  language: string;
  duration?: number;
  wordCount: number;
  summary: { short: string; medium: string; detailed: string };
  topics: { main: string; subtopics: string[]; keywords: string[]; insights: string[]; cta: string };
  createdAt: string;
  status: "done" | "error";
  errorMsg?: string;
}

export function transcriptionKey(id: string) { return `transcription:${id}`; }
export function transcriptionsListKey(email: string) { return `transcriptions:${email}`; }

async function transcribeWithWhisper(buffer: Buffer, filename: string, mimeType: string): Promise<{ text: string; language: string; duration: number }> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) throw new Error("OPENAI_API_KEY não configurada");

  const form = new FormData();
  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  form.append("file", new File([ab], filename, { type: mimeType }));
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openaiKey}` },
    body: form,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? `Whisper error ${res.status}`);

  return {
    text: data.text ?? "",
    language: data.language ?? "pt",
    duration: data.duration ?? 0,
  };
}

async function analyzeWithAI(transcript: string, title: string): Promise<TranscriptionRecord["summary"] & { topics: TranscriptionRecord["topics"] }> {
  const prompt = `Você é um especialista em análise de conteúdo para redes sociais.

Analise a seguinte transcrição e gere um JSON estruturado com análise completa.

TÍTULO: ${title}
TRANSCRIÇÃO:
${transcript.substring(0, 6000)}

Retorne APENAS este JSON válido, sem markdown:
{
  "summary": {
    "short": "resumo de 1-2 frases impactantes",
    "medium": "resumo de 1 parágrafo (5-6 frases) explicando os pontos principais",
    "detailed": "análise completa em 2-3 parágrafos com contexto, argumentos e conclusões"
  },
  "topics": {
    "main": "tema central do conteúdo em até 8 palavras",
    "subtopics": ["subtema 1", "subtema 2", "subtema 3"],
    "keywords": ["palavra1", "palavra2", "palavra3", "palavra4", "palavra5"],
    "insights": [
      "insight acionável 1 baseado no conteúdo",
      "insight acionável 2",
      "insight acionável 3"
    ],
    "cta": "chamada para ação sugerida para o carrossel"
  }
}`;

  const raw = await geminiText(prompt, { maxTokens: 1500, temperature: 0.5 });

  try {
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(clean);
    return { ...parsed.summary, topics: parsed.topics };
  } catch {
    return {
      short: transcript.substring(0, 200) + "...",
      medium: transcript.substring(0, 500) + "...",
      detailed: transcript.substring(0, 1000) + "...",
      topics: {
        main: title,
        subtopics: [],
        keywords: [],
        insights: ["Análise automática indisponível"],
        cta: "Siga para mais conteúdo",
      },
    };
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { path, title, sourceType = "upload", sourceUrl } = await req.json();
  if (!path && !sourceUrl) return NextResponse.json({ error: "path ou sourceUrl obrigatório" }, { status: 400 });

  const id = randomUUID();
  let buffer: Buffer;
  let filename: string;
  let mimeType: string;

  try {
    if (sourceUrl && !path) {
      // Download from URL
      const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`Não foi possível baixar o arquivo: ${response.statusText}`);
      const contentType = response.headers.get("content-type") ?? "audio/mpeg";
      mimeType = contentType.split(";")[0].trim();
      buffer = Buffer.from(await response.arrayBuffer());
      filename = sourceUrl.split("/").pop()?.split("?")[0] ?? "audio.mp3";
    } else {
      // Download from Supabase Storage
      const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(path);
      if (error || !data) throw new Error(error?.message ?? "Arquivo não encontrado no storage");
      buffer = Buffer.from(await data.arrayBuffer());
      filename = path.split("/").pop() ?? "audio.mp3";
      const ext = filename.split(".").pop()?.toLowerCase() ?? "mp3";
      const EXT_MIME: Record<string, string> = {
        mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/m4a",
        ogg: "audio/ogg", mp4: "video/mp4", mov: "video/quicktime",
        webm: "video/webm", avi: "video/x-msvideo",
      };
      mimeType = EXT_MIME[ext] ?? "audio/mpeg";
    }

    if (buffer.length > 26_214_400) {
      return NextResponse.json({ error: "Arquivo muito grande. Máximo 25MB para transcrição." }, { status: 400 });
    }

    // Transcribe
    const { text, language, duration } = await transcribeWithWhisper(buffer, filename, mimeType);
    if (!text.trim()) throw new Error("Não foi possível extrair texto do áudio. Verifique se há fala no arquivo.");

    // Analyze
    const analysis = await analyzeWithAI(text, title ?? filename);

    const record: TranscriptionRecord = {
      id,
      email,
      title: title ?? filename,
      sourceType,
      filePath: path ?? undefined,
      sourceUrl: sourceUrl ?? undefined,
      transcript: text,
      language,
      duration,
      wordCount: text.split(/\s+/).length,
      summary: { short: analysis.short, medium: analysis.medium, detailed: analysis.detailed },
      topics: analysis.topics,
      createdAt: new Date().toISOString(),
      status: "done",
    };

    // Persist
    await redisSet(transcriptionKey(id), JSON.stringify(record));
    await redisLPush(transcriptionsListKey(email), id);
    await redisLTrim(transcriptionsListKey(email), 0, 49); // Keep last 50

    return NextResponse.json({ ok: true, record });
  } catch (err: any) {
    console.error("[transcricao/process]", err.message);
    const failed: Partial<TranscriptionRecord> = {
      id, email, title: title ?? "Transcrição", sourceType,
      transcript: "", language: "pt", wordCount: 0,
      summary: { short: "", medium: "", detailed: "" },
      topics: { main: "", subtopics: [], keywords: [], insights: [], cta: "" },
      createdAt: new Date().toISOString(),
      status: "error",
      errorMsg: err.message,
    };
    await redisSet(transcriptionKey(id), JSON.stringify(failed));
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
