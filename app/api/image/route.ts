import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/stripe";
import { verifyToken } from "@/lib/activation";
import { isEmailActive } from "@/lib/kv";
import { stripe } from "@/lib/stripe";
import { redisIncr } from "@/lib/redis";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

async function enhancePrompt(raw: string): Promise<string> {
  try {
    const anthropic = new Anthropic();
    const timeout = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 4000)
    );
    const call = anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      messages: [{
        role: "user",
        content: `Transform this into a vivid cinematic English image prompt (max 50 words). Translate if needed. Add lighting, mood, composition details. Return ONLY the prompt.\n\nInput: "${raw}"`,
      }],
    }).then((msg) => ((msg.content[0] as any).text ?? "").trim() || raw);
    const enhanced = await Promise.race([call, timeout]);
    console.log(`[image] prompt: "${raw}" → "${enhanced}"`);
    return enhanced;
  } catch {
    return raw;
  }
}

type ImageStyle = "gemini" | "foto_real";

const PROMPTS: Record<ImageStyle, string> = {
  gemini: `cinematic high-quality image, dramatic lighting, rich colors, sharp focus, ultra-detailed, professional photography, Instagram editorial aesthetic, no text, no watermarks, no logos`,
  foto_real: `ultra-realistic documentary photograph, natural light, sharp focus, authentic candid moment, photojournalism quality, true-to-life colors, no retouching, no text, no watermarks`,
};

function buildPrompt(subject: string, style: ImageStyle): string {
  const stylePrompt = PROMPTS[style] ?? PROMPTS.gemini;
  return `${subject}. ${stylePrompt}. Portrait orientation 4:5 aspect ratio.`;
}

// ── Gemini Flash Image Generation (tenta múltiplos modelos) ──
async function fromGemini(prompt: string, style: ImageStyle) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY não configurada");

  const fullPrompt = buildPrompt(prompt, style);

  const MODELS = [
    "gemini-2.0-flash-preview-image-generation",
    "gemini-2.0-flash-exp-image-generation",
    "gemini-2.0-flash-thinking-exp-image-generation",
  ];

  let lastError = "";
  for (const model of MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
        signal: AbortSignal.timeout(18000),
      });

      const data = await res.json();
      if (!res.ok) {
        lastError = data.error?.message ?? `Gemini HTTP ${res.status}`;
        console.error(`[image] ${model} falhou:`, lastError);
        continue;
      }

      const parts = data.candidates?.[0]?.content?.parts ?? [];
      const imagePart = parts.find((p: any) => p.inlineData);
      if (!imagePart?.inlineData) {
        lastError = `${model}: sem imagem na resposta`;
        continue;
      }

      const { data: b64, mimeType } = imagePart.inlineData;
      console.log(`[image] Gemini OK (${model})`);
      return { imageUrl: `data:${mimeType};base64,${b64}`, source: "gemini" };
    } catch (e: any) {
      lastError = e.message;
    }
  }
  throw new Error(lastError || "Gemini: falha em todos os modelos");
}

// ── Imagen 4 ──────────────────────────────────────────────────
async function fromImagen4(prompt: string, style: ImageStyle) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY não configurada");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt: buildPrompt(prompt, style) }],
      parameters: { sampleCount: 1, aspectRatio: "3:4", safetyFilterLevel: "block_few", personGeneration: "allow_adult" },
    }),
    signal: AbortSignal.timeout(50000),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? `Imagen4 HTTP ${res.status}`);
  const pred = data.predictions?.[0];
  if (!pred?.bytesBase64Encoded) throw new Error("Imagen4: sem imagem");
  console.log("[image] Imagen 4 OK");
  return { imageUrl: `data:${pred.mimeType ?? "image/png"};base64,${pred.bytesBase64Encoded}`, source: "imagen4" };
}

// ── Imagen 3 ──────────────────────────────────────────────────
async function fromImagen3(prompt: string, style: ImageStyle) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY não configurada");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt: buildPrompt(prompt, style) }],
      parameters: { sampleCount: 1, aspectRatio: "3:4", safetyFilterLevel: "block_few", personGeneration: "allow_adult" },
    }),
    signal: AbortSignal.timeout(40000),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? `Imagen3 HTTP ${res.status}`);
  const pred = data.predictions?.[0];
  if (!pred?.bytesBase64Encoded) throw new Error("Imagen3: sem imagem");
  console.log("[image] Imagen 3 OK");
  return { imageUrl: `data:${pred.mimeType ?? "image/png"};base64,${pred.bytesBase64Encoded}`, source: "imagen3" };
}

// ── Gemini com imagem de referência ──────────────────────────
async function fromGeminiWithReference(prompt: string, style: ImageStyle, refBase64: string, refMime: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY não configurada");

  const styleGuide = PROMPTS[style] ?? PROMPTS.gemini;
  const textInstruction = `Use this image as visual reference. Transform it into a stylized Instagram carousel slide background: "${prompt}". Style: ${styleGuide}. Portrait 4:5. No text, no watermarks.`;

  const MODELS = ["gemini-2.0-flash-preview-image-generation", "gemini-2.0-flash-exp-image-generation"];
  let lastError = "";

  for (const model of MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ inlineData: { mimeType: refMime, data: refBase64 } }, { text: textInstruction }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
        signal: AbortSignal.timeout(45000),
      });

      const data = await res.json();
      if (!res.ok) { lastError = data.error?.message ?? `Gemini HTTP ${res.status}`; continue; }

      const parts = data.candidates?.[0]?.content?.parts ?? [];
      const imagePart = parts.find((p: any) => p.inlineData);
      if (!imagePart?.inlineData) { lastError = "sem imagem na resposta"; continue; }

      const { data: b64, mimeType } = imagePart.inlineData;
      console.log(`[image] Gemini reference OK (${model})`);
      return { imageUrl: `data:${mimeType};base64,${b64}`, source: "gemini_ref" };
    } catch (e: any) {
      lastError = e.message;
    }
  }
  throw new Error(lastError || "GeminiRef: falha");
}

// ── OpenRouter — Gemini Flash Image Preview ───────────────────
async function fromOpenRouter(prompt: string, style: ImageStyle) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY não configurada");

  const subjectPrompt = buildPrompt(prompt, style);

  // System prompt obriga o modelo a sempre gerar uma imagem
  const SYSTEM = "You are an image generation AI. Your ONLY job is to generate images. You MUST always respond with an image. Never respond with only text. Always include an image in your response, no exceptions.";

  // User prompt explícito para geração de imagem
  const USER = `Generate a high-quality image of the following: ${subjectPrompt}\n\nIMPORTANT: You MUST generate and return an actual image. Do not describe it — create it.`;

  const body = JSON.stringify({
    model: "google/gemini-3.1-flash-image-preview",
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user",   content: USER },
    ],
    modalities: ["image"],
  });

  const headers = {
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.NEXT_PUBLIC_BASE_URL ?? "https://xpostzone.online",
    "X-Title": "XPost Zone",
  };

  // Tenta até 2 vezes antes de desistir
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST", headers, body,
      signal: AbortSignal.timeout(52000),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error(`[image] OpenRouter tentativa ${attempt} HTTP ${res.status}:`, data.error?.message);
      if (attempt === 2) throw new Error(data.error?.message ?? `OpenRouter HTTP ${res.status}`);
      continue;
    }

    console.log(`[image] OpenRouter tentativa ${attempt} — tipo content:`, typeof data.choices?.[0]?.message?.content);

    // Formato array de parts (multimodal)
    const parts: any[] = data.choices?.[0]?.message?.content ?? [];
    if (Array.isArray(parts)) {
      const imgPart = parts.find((p: any) => p.type === "image_url" && p.image_url?.url);
      if (imgPart) {
        console.log("[image] OpenRouter OK (array parts)");
        return { imageUrl: imgPart.image_url.url, source: "openrouter" };
      }
      // inline_data (base64 embutido)
      const inlinePart = parts.find((p: any) => p.inline_data?.data);
      if (inlinePart) {
        const { data: b64, mime_type } = inlinePart.inline_data;
        console.log("[image] OpenRouter OK (inline_data)");
        return { imageUrl: `data:${mime_type ?? "image/png"};base64,${b64}`, source: "openrouter" };
      }
    }

    // Formato string base64 direta
    const content = data.choices?.[0]?.message?.content;
    if (typeof content === "string" && content.startsWith("data:image")) {
      console.log("[image] OpenRouter OK (string b64)");
      return { imageUrl: content, source: "openrouter" };
    }

    console.warn(`[image] OpenRouter tentativa ${attempt}: sem imagem na resposta. Content:`, JSON.stringify(data.choices?.[0]?.message?.content)?.slice(0, 200));
    if (attempt === 2) throw new Error("OpenRouter: sem imagem após 2 tentativas");
  }

  throw new Error("OpenRouter: falha inesperada");
}

// ── Pexels (fallback final) ───────────────────────────────────
async function fromPexels(prompt: string) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) throw new Error("PEXELS_API_KEY não configurada");

  const query = prompt.replace(/<[^>]+>/g, "").replace(/[^\w\sÀ-ÿ]/g, "").trim()
    .split(/\s+/).slice(0, 5).join(" ") || "business technology";

  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=portrait&per_page=15&page=${Math.ceil(Math.random() * 3)}`,
    { headers: { Authorization: key } }
  );
  if (!res.ok) throw new Error(`Pexels HTTP ${res.status}`);

  const data = await res.json();
  const photos = data.photos ?? [];
  if (!photos.length) throw new Error("Pexels: sem resultados");

  const photo = photos[Math.floor(Math.random() * photos.length)];
  console.log("[image] Pexels fallback OK");
  return { imageUrl: photo.src?.large2x ?? photo.src?.original, source: "pexels" };
}

// ── Handler principal ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { prompt, imageStyle = "gemini", customerId, activationToken, referenceImageBase64, referenceImageMime } = await req.json();
  if (!prompt) return NextResponse.json({ error: "prompt obrigatório" }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);
  redisIncr(`stats:images:${today}`).catch(() => {});

  const style: ImageStyle = (imageStyle === "foto_real") ? "foto_real" : "gemini";
  const hasReference = !!(referenceImageBase64 && referenceImageMime);

  // Rodam em paralelo para economizar tempo
  const [enhancedPrompt, session] = await Promise.all([
    enhancePrompt(prompt),
    getServerSession(authOptions),
  ]);

  // ── Verificar plano ───────────────────────────────────────────
  let isPro = false;
  const email = session?.user?.email;
  if (email) {
    const kirvano = await isEmailActive(email).catch(() => false);
    if (kirvano) {
      isPro = true;
    } else {
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (customers.data.length > 0) isPro = await hasActiveSubscription(customers.data[0].id);
    }
  }
  if (!isPro && customerId) isPro = await hasActiveSubscription(customerId);
  if (!isPro && activationToken) { const { valid } = verifyToken(activationToken); isPro = valid; }

  // ── Plano gratuito: Gemini 3.1 → OpenRouter → Pexels ────────
  if (!isPro) {
    try {
      return NextResponse.json({ ...await fromGemini(enhancedPrompt, style), plan: "free" });
    } catch (e: any) {
      console.error("[image] Gemini free falhou:", e.message);
    }
    try {
      return NextResponse.json({ ...await fromOpenRouter(enhancedPrompt, style), plan: "free" });
    } catch (e: any) {
      console.error("[image] OpenRouter free falhou:", e.message);
    }
    try {
      return NextResponse.json({ ...await fromPexels(enhancedPrompt), plan: "free_fallback" });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  // ── Plano Pro: Gemini 3.1 → GeminiRef → Imagen4 → Imagen3 → OpenRouter → Pexels
  const errors: string[] = [];

  try {
    return NextResponse.json({ ...await fromGemini(enhancedPrompt, style), plan: "pro" });
  } catch (e: any) {
    errors.push(`Gemini: ${e.message}`);
    console.error("[image] Gemini pro falhou:", e.message);
  }

  if (hasReference) {
    try {
      return NextResponse.json({ ...await fromGeminiWithReference(enhancedPrompt, style, referenceImageBase64, referenceImageMime), plan: "pro_ref" });
    } catch (e: any) {
      errors.push(`GeminiRef: ${e.message}`);
    }
  }

  try {
    return NextResponse.json({ ...await fromImagen4(enhancedPrompt, style), plan: "pro" });
  } catch (e: any) {
    errors.push(`Imagen4: ${e.message}`);
    console.error("[image] Imagen4 falhou:", e.message);
  }

  try {
    return NextResponse.json({ ...await fromImagen3(enhancedPrompt, style), plan: "pro" });
  } catch (e: any) {
    errors.push(`Imagen3: ${e.message}`);
    console.error("[image] Imagen3 falhou:", e.message);
  }

  try {
    return NextResponse.json({ ...await fromOpenRouter(enhancedPrompt, style), plan: "pro" });
  } catch (e: any) {
    errors.push(`OpenRouter: ${e.message}`);
    console.error("[image] OpenRouter pro falhou:", e.message);
  }

  try {
    return NextResponse.json({ ...await fromPexels(enhancedPrompt), plan: "fallback" });
  } catch (e: any) {
    errors.push(`Pexels: ${e.message}`);
    return NextResponse.json({ error: errors.join(" | ") }, { status: 500 });
  }
}
