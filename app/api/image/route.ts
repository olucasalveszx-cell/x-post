import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyToken } from "@/lib/activation";
import { getUserPlan } from "@/lib/credits";
import { redisGet, redisSet, redisIncr, redisLPush, redisLTrim } from "@/lib/redis";
import { put } from "@vercel/blob";
import { geminiText } from "@/lib/gemini-text";
import { supabaseAdmin } from "@/lib/supabase";

export const maxDuration = 60;

async function enhancePrompt(raw: string): Promise<string> {
  try {
    const timeout = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 4000)
    );
    const call = geminiText(
      `Transform this into a vivid cinematic English image prompt (max 50 words). Translate if needed. Add lighting, mood, composition details. Return ONLY the prompt.\n\nInput: "${raw}"`,
      { maxTokens: 100 }
    ).then((t) => t.trim() || raw);
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

// ── OpenAI gpt-image-1 ────────────────────────────────────────
async function fromOpenAI(prompt: string, style: ImageStyle) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY não configurada");

  const fullPrompt = buildPrompt(prompt, style);

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: fullPrompt,
      n: 1,
      size: "1024x1536",
      quality: "high",
    }),
    signal: AbortSignal.timeout(120000),
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data.error?.message ?? `OpenAI HTTP ${res.status}`;
    console.error("[image] OpenAI falhou:", msg);
    throw new Error(msg);
  }

  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI: sem imagem na resposta");

  console.log("[image] OpenAI gpt-image-1 OK");
  return { imageUrl: `data:image/png;base64,${b64}`, source: "openai" };
}

// ── OpenAI gpt-image-1 com referência facial ─────────────────
async function fromOpenAIWithReference(
  prompt: string,
  style: ImageStyle,
  refBase64: string,
  refMime: string
) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY não configurada");

  const styleHint = PROMPTS[style] ?? PROMPTS.gemini;
  const fullPrompt = `${prompt}. ${styleHint}. Portrait orientation 4:5 aspect ratio. Use the reference image to maintain the person's facial identity, features, skin tone, and proportions exactly as shown — do not alter the individual.`;

  const imageBuffer = Buffer.from(refBase64, "base64");
  const ext = refMime.split("/")[1]?.split("+")[0] ?? "jpg";

  const formData = new FormData();
  formData.append("model", "gpt-image-1");
  formData.append(
    "image",
    new Blob([imageBuffer], { type: refMime }),
    `reference.${ext}`
  );
  formData.append("prompt", fullPrompt);
  formData.append("n", "1");
  formData.append("size", "1024x1536");
  formData.append("quality", "high");

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}` },
    body: formData,
    signal: AbortSignal.timeout(120000),
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data.error?.message ?? `OpenAI edits HTTP ${res.status}`;
    console.error("[image] OpenAI edits (referência) falhou:", msg);
    throw new Error(msg);
  }

  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI edits: sem imagem na resposta");

  console.log("[image] OpenAI gpt-image-1 edits (referência facial) OK");
  return { imageUrl: `data:image/png;base64,${b64}`, source: "openai-reference" };
}

// ── fal.ai FLUX 1.1 Pro ──────────────────────────────────────
async function fromFal(prompt: string, style: ImageStyle) {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY não configurada");

  const fullPrompt = buildPrompt(prompt, style);
  const res = await fetch("https://fal.run/fal-ai/flux-pro/v1.1", {
    method: "POST",
    headers: { "Authorization": `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: fullPrompt, image_size: "portrait_4_3", num_images: 1, sync_mode: true, safety_tolerance: "5" }),
    signal: AbortSignal.timeout(60000),
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data.detail ?? data.error ?? `fal.ai HTTP ${res.status}`;
    console.error("[image] fal.ai falhou:", msg, JSON.stringify(data).slice(0, 300));
    throw new Error(msg);
  }

  const imageUrl = data.images?.[0]?.url;
  if (!imageUrl) {
    console.error("[image] fal.ai: sem URL na resposta:", JSON.stringify(data).slice(0, 300));
    throw new Error("fal.ai: sem imagem na resposta");
  }

  console.log("[image] fal.ai FLUX 1.1 Pro OK");
  return { imageUrl, source: "fal" };
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
    "X-Title": "XPost",
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

// ── Cache de imagens ─────────────────────────────────────────
function makeCacheKey(prompt: string, style: ImageStyle): string {
  const normalized = prompt
    .toLowerCase().trim()
    .replace(/[^\w\sà-ÿ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
  return `img:v1:${style}:${normalized}`;
}

async function getCachedImage(prompt: string, style: ImageStyle): Promise<string | null> {
  try {
    const url = await redisGet(makeCacheKey(prompt, style));
    if (url) console.log(`[image] cache HIT — ${prompt.slice(0, 60)}`);
    return url;
  } catch { return null; }
}

async function cacheImage(prompt: string, style: ImageStyle, url: string): Promise<void> {
  try {
    await redisSet(makeCacheKey(prompt, style), url);
    console.log(`[image] cache SET — ${prompt.slice(0, 60)}`);
  } catch (e: any) {
    console.warn("[image] cache set falhou:", e.message);
  }
}

// ── Salva imagem no banco global (Blob + Redis) ───────────────
async function saveToGallery(imageUrl: string, email: string | null | undefined, prompt: string, style: ImageStyle, source: string) {
  try {
    let finalUrl = imageUrl;

    if (imageUrl.startsWith("data:")) {
      try {
        const [header, b64] = imageUrl.split(",");
        const mimeType = header.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";
        const ext = mimeType.split("/")[1]?.split("+")[0] ?? "jpg";
        const buffer = Buffer.from(b64, "base64");
        const blob = await put(
          `gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`,
          buffer,
          { access: "public" as any, contentType: mimeType }
        );
        finalUrl = blob.url;
      } catch {
        console.warn("[image] blob upload falhou, galeria não salva");
        return;
      }
    }

    // Salva no cache permanente (evita nova geração paga no futuro)
    await cacheImage(prompt, style, finalUrl);

    // Salva na lista global (sem limite — banco próprio de imagens)
    const globalEntry = JSON.stringify({ url: finalUrl, email: email ?? "anon", prompt, style, source, createdAt: new Date().toISOString() });
    await redisLPush("images:global", globalEntry);

    if (email) {
      const userEntry = JSON.stringify({ url: finalUrl, prompt, savedAt: new Date().toISOString() });
      await redisLPush(`user:imgs:${email}`, userEntry);
      await redisLTrim(`user:imgs:${email}`, 0, 499);
    }

    console.log(`[image] salvo no banco (${source}): ${finalUrl.slice(0, 80)}`);
  } catch (e: any) {
    console.error("[image] save failed:", e.message);
  }
}

// ── Handler principal ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { prompt, imageStyle = "gemini", activationToken, referenceImageBase64, referenceImageMime } = await req.json();
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

  // ── Checar banco de imagens (cache permanente) ────────────────
  // Imagens de referência nunca usam cache — são únicas por design
  if (!hasReference) {
    const cached = await getCachedImage(enhancedPrompt, style);
    if (cached) {
      if (email) {
        const userEntry = JSON.stringify({ url: cached, prompt: enhancedPrompt, savedAt: new Date().toISOString() });
        redisLPush(`user:imgs:${email}`, userEntry).catch(() => {});
        redisLTrim(`user:imgs:${email}`, 0, 499).catch(() => {});
      }
      return NextResponse.json({ imageUrl: cached, source: "cache", plan: "cache" });
    }
  }

  type ImageResult = { imageUrl: string; source: string };
  let result: ImageResult | null = null;
  let plan = "free";
  const errors: string[] = [];

  if (hasReference) {
    // Cascade com referência: OpenAI edits primeiro, depois geração normal como fallback
    const tries: Array<() => Promise<ImageResult>> = [
      () => fromOpenAIWithReference(enhancedPrompt, style, referenceImageBase64!, referenceImageMime!).then(r => { plan = "reference"; return r; }),
      () => fromOpenAI(enhancedPrompt, style).then(r => { plan = isPro ? "pro" : "free"; return r; }),
      () => fromFal(enhancedPrompt, style).then(r => { plan = isPro ? "pro" : "free"; return r; }),
      () => fromGoogleImages(prompt).then(r => { plan = "fallback"; return r; }),
      () => fromPexels(prompt).then(r => { plan = "fallback"; return r; }),
    ];
    for (const fn of tries) {
      if (result) break;
      try { result = await fn(); } catch (e: any) { errors.push(e.message); }
    }
  } else if (!isPro) {
    const tries: Array<() => Promise<ImageResult>> = [
      () => fromOpenAI(enhancedPrompt, style).then(r => { plan = "free"; return r; }),
      () => fromFal(enhancedPrompt, style).then(r => { plan = "free"; return r; }),
      () => fromGoogleImages(prompt).then(r => { plan = "free_fallback"; return r; }),
      () => fromPexels(prompt).then(r => { plan = "free_fallback"; return r; }),
    ];
    for (const fn of tries) {
      if (result) break;
      try { result = await fn(); } catch (e: any) { errors.push(e.message); }
    }
  } else {
    const tries: Array<() => Promise<ImageResult>> = [
      () => fromOpenAI(enhancedPrompt, style).then(r => { plan = "pro"; return r; }),
      () => fromFal(enhancedPrompt, style).then(r => { plan = "pro"; return r; }),
      () => fromOpenRouter(enhancedPrompt, style).then(r => { plan = "pro"; return r; }),
      () => fromGoogleImages(prompt).then(r => { plan = "fallback"; return r; }),
      () => fromPexels(prompt).then(r => { plan = "fallback"; return r; }),
    ];
    for (const fn of tries) {
      if (result) break;
      try { result = await fn(); } catch (e: any) { errors.push(e.message); }
    }
  }

  if (!result) return NextResponse.json({ error: errors.join(" | ") }, { status: 500 });

  // waitUntil garante que o Vercel mantém a função viva até o salvamento completar
  waitUntil(saveToGallery(result.imageUrl, email, enhancedPrompt, style, result.source));

  // Salvar na tabela generated_images quando referência foi usada
  if (hasReference && email && result.source === "openai-reference") {
    waitUntil(
      (async () => {
        try {
          // Resolver reference_image_id se existir no Supabase
          const { data: refImg } = await supabaseAdmin
            .from("user_reference_images")
            .select("id")
            .eq("user_id", email)
            .eq("is_default", true)
            .limit(1)
            .single();

          // Converter data URL para blob e salvar no Vercel Blob
          let finalUrl = result!.imageUrl;
          if (finalUrl.startsWith("data:")) {
            const [header, b64] = finalUrl.split(",");
            const mime = header.match(/data:([^;]+)/)?.[1] ?? "image/png";
            const ext = mime.split("/")[1] ?? "png";
            const buf = Buffer.from(b64, "base64");
            const blob = await put(
              `generated/${Date.now()}.${ext}`,
              buf,
              { access: "public" as any, contentType: mime }
            );
            finalUrl = blob.url;
          }

          await supabaseAdmin.from("generated_images").insert({
            user_id: email,
            prompt: enhancedPrompt,
            reference_image_id: refImg?.id ?? null,
            image_url: finalUrl,
          });
        } catch (e: any) {
          console.warn("[image] generated_images save falhou:", e.message);
        }
      })()
    );
  }

  return NextResponse.json({ ...result, plan, ...(errors.length ? { fallbackErrors: errors } : {}) });
}
