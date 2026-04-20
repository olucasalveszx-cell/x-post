import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyToken } from "@/lib/activation";
import { getUserPlan } from "@/lib/credits";
import { redisIncr, redisLPush, redisLTrim } from "@/lib/redis";
import { put } from "@vercel/blob";
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

// ── Rotação de chaves Gemini ──────────────────────────────────
function getGeminiKeys(): string[] {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(Boolean) as string[];
}

// ── Gemini Flash Image Generation (tenta múltiplos modelos e chaves) ──
async function fromGemini(prompt: string, style: ImageStyle) {
  const keys = getGeminiKeys();
  if (!keys.length) throw new Error("GEMINI_API_KEY não configurada");

  const fullPrompt = buildPrompt(prompt, style);
  const MODELS = [
    "gemini-3-pro-image-preview",
    "gemini-2.0-flash-preview-image-generation",
    "gemini-2.0-flash-exp-image-generation",
  ];

  let lastError = "";
  for (const key of keys) {
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
          signal: AbortSignal.timeout(22000),
        });

        const data = await res.json();
        if (!res.ok) {
          lastError = data.error?.message ?? `Gemini HTTP ${res.status}`;
          console.error(`[image] ${model} (key${keys.indexOf(key)+1}) falhou:`, lastError);
          // Se for quota, tenta próxima chave imediatamente
          if (res.status === 429) break;
          continue;
        }

        const parts = data.candidates?.[0]?.content?.parts ?? [];
        const imagePart = parts.find((p: any) => p.inlineData);
        if (!imagePart?.inlineData) { lastError = `${model}: sem imagem`; continue; }

        const { data: b64, mimeType } = imagePart.inlineData;
        console.log(`[image] Gemini OK (${model}, key${keys.indexOf(key)+1})`);
        return { imageUrl: `data:${mimeType};base64,${b64}`, source: "gemini" };
      } catch (e: any) {
        lastError = e.message;
      }
    }
  }
  throw new Error(lastError || "Gemini: falha em todos os modelos/chaves");
}

// ── Imagen 4 ──────────────────────────────────────────────────
async function fromImagen4(prompt: string, style: ImageStyle) {
  const keys = getGeminiKeys();
  if (!keys.length) throw new Error("GEMINI_API_KEY não configurada");

  let lastError = "";
  for (const key of keys) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${key}`;
    try {
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
      if (!res.ok) { lastError = data.error?.message ?? `Imagen4 HTTP ${res.status}`; continue; }
      const pred = data.predictions?.[0];
      if (!pred?.bytesBase64Encoded) { lastError = "Imagen4: sem imagem"; continue; }
      console.log(`[image] Imagen 4 OK (key${keys.indexOf(key)+1})`);
      return { imageUrl: `data:${pred.mimeType ?? "image/png"};base64,${pred.bytesBase64Encoded}`, source: "imagen4" };
    } catch (e: any) { lastError = e.message; }
  }
  throw new Error(lastError || "Imagen4: falha em todas as chaves");
}

// ── Imagen 4 Fast ─────────────────────────────────────────────
async function fromImagen3(prompt: string, style: ImageStyle) {
  const keys = getGeminiKeys();
  if (!keys.length) throw new Error("GEMINI_API_KEY não configurada");

  let lastError = "";
  for (const key of keys) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${key}`;
    try {
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
      if (!res.ok) { lastError = data.error?.message ?? `Imagen3 HTTP ${res.status}`; continue; }
      const pred = data.predictions?.[0];
      if (!pred?.bytesBase64Encoded) { lastError = "Imagen3: sem imagem"; continue; }
      console.log(`[image] Imagen 4 Fast OK (key${keys.indexOf(key)+1})`);
      return { imageUrl: `data:${pred.mimeType ?? "image/png"};base64,${pred.bytesBase64Encoded}`, source: "imagen3" };
    } catch (e: any) { lastError = e.message; }
  }
  throw new Error(lastError || "Imagen3: falha em todas as chaves");
}

// ── Gemini com imagem de referência ──────────────────────────
async function fromGeminiWithReference(prompt: string, style: ImageStyle, refBase64: string, refMime: string) {
  const keys = getGeminiKeys();
  if (!keys.length) throw new Error("GEMINI_API_KEY não configurada");
  const key = keys[0];

  const styleGuide = PROMPTS[style] ?? PROMPTS.gemini;
  const textInstruction = `Use this image as visual reference. Transform it into a stylized Instagram carousel slide background: "${prompt}". Style: ${styleGuide}. Portrait 4:5. No text, no watermarks.`;

  const MODELS = ["gemini-3-pro-image-preview", "gemini-2.0-flash-preview-image-generation", "gemini-2.0-flash-exp-image-generation"];
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

  // Tenta 1 vez com timeout curto para não estourar o maxDuration
  for (let attempt = 1; attempt <= 1; attempt++) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST", headers, body,
      signal: AbortSignal.timeout(25000),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error(`[image] OpenRouter tentativa ${attempt} HTTP ${res.status}:`, data.error?.message);
      throw new Error(data.error?.message ?? `OpenRouter HTTP ${res.status}`);
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

// ── Google Custom Search — imagens relevantes ────────────────
async function fromGoogleImages(prompt: string) {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cseId  = process.env.GOOGLE_CSE_ID;
  if (!apiKey || !cseId) throw new Error("GOOGLE_SEARCH_API_KEY/GOOGLE_CSE_ID não configurados");

  const query = prompt.replace(/<[^>]+>/g, "").replace(/[^\w\sÀ-ÿ]/g, " ").trim()
    .split(/\s+/).slice(0, 8).join(" ") || "photography";

  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodeURIComponent(query)}&searchType=image&imgSize=LARGE&imgType=photo&num=10&safe=active`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Google Images HTTP ${res.status}: ${err.error?.message ?? ""}`);
  }

  const data = await res.json();
  const items: any[] = data.items ?? [];
  if (!items.length) throw new Error("Google Images: sem resultados");

  const pick = items[Math.floor(Math.random() * Math.min(items.length, 5))];
  console.log("[image] Google Images OK");
  return { imageUrl: pick.link, source: "google" };
}

// ── Unsplash (fallback) ───────────────────────────────────────
async function fromUnsplash(prompt: string) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) throw new Error("UNSPLASH_ACCESS_KEY não configurada");

  const query = prompt.replace(/<[^>]+>/g, "").replace(/[^\w\sÀ-ÿ]/g, "").trim()
    .split(/\s+/).slice(0, 5).join(" ") || "business technology";

  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=portrait&per_page=15&page=${Math.ceil(Math.random() * 3)}`,
    { headers: { Authorization: `Client-ID ${key}` } }
  );
  if (!res.ok) throw new Error(`Unsplash HTTP ${res.status}`);

  const data = await res.json();
  const results = data.results ?? [];
  if (!results.length) throw new Error("Unsplash: sem resultados");

  const photo = results[Math.floor(Math.random() * results.length)];
  const url = photo.urls?.regular ?? photo.urls?.full;
  if (!url) throw new Error("Unsplash: URL inválida");
  console.log("[image] Unsplash fallback OK");
  return { imageUrl: url, source: "unsplash" };
}

// ── Pixabay (fallback) ────────────────────────────────────────
async function fromPixabay(prompt: string) {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) throw new Error("PIXABAY_API_KEY não configurada");

  const query = prompt.replace(/<[^>]+>/g, "").replace(/[^\w\sÀ-ÿ]/g, "").trim()
    .split(/\s+/).slice(0, 5).join(" ") || "business technology";

  const res = await fetch(
    `https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(query)}&image_type=photo&orientation=vertical&per_page=15&page=${Math.ceil(Math.random() * 3)}`
  );
  if (!res.ok) throw new Error(`Pixabay HTTP ${res.status}`);

  const data = await res.json();
  const hits = data.hits ?? [];
  if (!hits.length) throw new Error("Pixabay: sem resultados");

  const photo = hits[Math.floor(Math.random() * hits.length)];
  const url = photo.largeImageURL ?? photo.webformatURL;
  if (!url) throw new Error("Pixabay: URL inválida");
  console.log("[image] Pixabay fallback OK");
  return { imageUrl: url, source: "pixabay" };
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

// ── Salva imagem no banco global (Blob + Redis) ───────────────
async function saveToGallery(imageUrl: string, email: string | null | undefined, prompt: string, source: string) {
  try {
    let finalUrl = imageUrl;

    if (imageUrl.startsWith("data:")) {
      const [header, b64] = imageUrl.split(",");
      const mimeType = header.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";
      const ext = mimeType.split("/")[1]?.split("+")[0] ?? "jpg";
      const buffer = Buffer.from(b64, "base64");
      const blob = await put(
        `gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`,
        buffer,
        { access: "public", contentType: mimeType }
      );
      finalUrl = blob.url;
    }

    const globalEntry = JSON.stringify({ url: finalUrl, email: email ?? "anon", prompt, source, createdAt: new Date().toISOString() });
    await redisLPush("images:global", globalEntry);
    await redisLTrim("images:global", 0, 499);

    if (email) {
      const userEntry = JSON.stringify({ url: finalUrl, savedAt: new Date().toISOString() });
      await redisLPush(`user:imgs:${email}`, userEntry);
      await redisLTrim(`user:imgs:${email}`, 0, 99);
    }

    console.log(`[image] gallery saved (${source}): ${finalUrl.slice(0, 80)}`);
  } catch (e: any) {
    console.error("[image] gallery save failed:", e.message);
  }
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
    const plan = await getUserPlan(email).catch(() => "free");
    isPro = plan !== "free";
  }
  if (!isPro && activationToken) { const { valid } = verifyToken(activationToken); isPro = valid; }

  type ImageResult = { imageUrl: string; source: string };
  let result: ImageResult | null = null;
  let plan = "free";
  const errors: string[] = [];

  if (!isPro) {
    const tries: Array<() => Promise<ImageResult>> = [
      () => fromGemini(enhancedPrompt, style).then(r => { plan = "free"; return r; }),
      () => fromOpenRouter(enhancedPrompt, style).then(r => { plan = "free"; return r; }),
      () => fromGoogleImages(prompt).then(r => { plan = "free_fallback"; return r; }),
      () => fromUnsplash(prompt).then(r => { plan = "free_fallback"; return r; }),
      () => fromPixabay(prompt).then(r => { plan = "free_fallback"; return r; }),
      () => fromPexels(prompt).then(r => { plan = "free_fallback"; return r; }),
    ];
    for (const fn of tries) {
      if (result) break;
      try { result = await fn(); } catch (e: any) { errors.push(e.message); }
    }
  } else {
    const tries: Array<() => Promise<ImageResult>> = [
      () => fromGemini(enhancedPrompt, style).then(r => { plan = "pro"; return r; }),
      ...(hasReference ? [() => fromGeminiWithReference(enhancedPrompt, style, referenceImageBase64, referenceImageMime).then(r => { plan = "pro_ref"; return r; })] : []),
      () => fromImagen4(enhancedPrompt, style).then(r => { plan = "pro"; return r; }),
      () => fromImagen3(enhancedPrompt, style).then(r => { plan = "pro"; return r; }),
      () => fromOpenRouter(enhancedPrompt, style).then(r => { plan = "pro"; return r; }),
      () => fromGoogleImages(prompt).then(r => { plan = "fallback"; return r; }),
      () => fromUnsplash(prompt).then(r => { plan = "fallback"; return r; }),
      () => fromPixabay(prompt).then(r => { plan = "fallback"; return r; }),
      () => fromPexels(prompt).then(r => { plan = "fallback"; return r; }),
    ];
    for (const fn of tries) {
      if (result) break;
      try { result = await fn(); } catch (e: any) { errors.push(e.message); }
    }
  }

  if (!result) return NextResponse.json({ error: errors.join(" | ") }, { status: 500 });

  // waitUntil garante que o Vercel mantém a função viva até o salvamento completar
  waitUntil(saveToGallery(result.imageUrl, email, enhancedPrompt, result.source));

  return NextResponse.json({ ...result, plan, ...(errors.length ? { fallbackErrors: errors } : {}) });
}
