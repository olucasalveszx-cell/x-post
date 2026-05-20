import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyToken } from "@/lib/activation";
import { getUserPlan } from "@/lib/credits";
import { redisGet, redisSet, redisIncr, redisLPush, redisLTrim } from "@/lib/redis";
import { put } from "@vercel/blob";
import { geminiText } from "@/lib/gemini-text";

export const maxDuration = 120;

async function enhancePrompt(raw: string): Promise<string> {
  try {
    const timeout = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 6000)
    );

    const INSTRUCTION = `You are a world-class AI image prompt engineer specializing in photorealistic, premium-quality image generation.

Your task: transform a short subject description into a rich, detailed English prompt that produces stunning, magazine-quality results with perfect exposure, color grade, and sharpness.

Rules:
- Translate to English if needed
- Expand subject: age/appearance, clothing details, exact action/pose, expression
- Environment: specific location, time of day, natural or artificial light source
- Lighting: direction (45°/backlit/split), quality (soft/hard), color temperature (warm 3200K/daylight 5600K)
- Color grade: specific LUT name or color science (teal-orange / muted film / vivid editorial / neutral RAW)
- Camera: body (Sony A7IV / Canon R5 / Leica M11), lens (85mm f/1.4 / 35mm f/2), DOF description
- Exposure: +0 EV balanced / +0.7 EV bright / -0.5 EV moody, no blown highlights, shadow detail preserved
- Quality suffix: 8K ultra-sharp, micro skin texture, no noise, no artifacts, no text, no watermarks, no logos
- Max 90 words. Return ONLY the prompt.

Input: "${raw}"`;

    const call = geminiText(INSTRUCTION, { maxTokens: 180 }).then((t) => t.trim() || raw);
    const enhanced = await Promise.race([call, timeout]);
    console.log(`[image] prompt: "${raw}" → "${enhanced}"`);
    return enhanced;
  } catch {
    return raw;
  }
}

type ImageStyle = "gemini" | "foto_real" | "cinematico" | "editorial" | "dark_mood" | "vibrante" | "minimalista";

const PROMPTS: Record<ImageStyle, string> = {
  gemini: `Sony A7IV 85mm f/1.8, well-lit exposure +0.4 EV bright and clear, soft key light 45° from left, warm 4800K daylight, gentle S-curve contrast with lifted shadows RGB(30,28,24), vivid accurate skin tones, shallow DOF creamy bokeh, face clearly visible and bright, ultra-detailed skin texture, no chromatic aberration, 8K sharp, no noise, no text, no watermarks`,

  foto_real: `Leica M11 35mm f/2, natural daylight exposure +0.3 EV, neutral color profile true-to-life skin tones, shadows lifted RGB(20,18,16) no crushed blacks, highlights clean not clipped, soft overcast fill light, face well-exposed and sharp, documentary photojournalism, 8K ultra-sharp, no text, no watermarks`,

  cinematico: `ARRI Alexa Mini LF anamorphic 40mm T1.9, teal-orange color grade, exposure +0.2 EV well-lit cinematic, blacks lifted RGB(18,14,10) not crushed, shadows warm amber, skin tones bright and rich golden hour glow, rim backlight 3200K, horizontal oval bokeh background, Kodak 2383 film emulation slight grain, face fully lit and visible, ultra-sharp subject, no text, no watermarks`,

  editorial: `Phase One IQ4 150MP, large format studio strobe key + fill 2:1, exposure +0.8 EV high-key bright, neutral white balance 5600K, perfect skin luminous and glowing, face bright and flattering, Vogue editorial vivid color, razor-sharp 100mm f/4, pristine background, luxury fashion aesthetic, no text, no watermarks`,

  dark_mood: `Canon R5 50mm f/1.2, dramatic side key light 90°, exposure -0.7 EV moody but face visible, blacks RGB(15,12,10) slightly lifted, high local contrast, shadows teal tint, skin highlights cool blue-grey, vignette 50% corners, face clearly readable despite drama, ultra-sharp subject, no text, no watermarks`,

  vibrante: `Sony A1 24mm f/2.8, golden hour backlit exposure +0.7 EV bright vibrant, vibrance +45 saturation +30, warm glowing skin tones, HDR microcontrast, 6-blade aperture sun flare burst, sky vivid blue, face luminous and energetic, crisp edge-to-edge sharpness, no text, no watermarks`,

  minimalista: `Hasselblad X2D 90mm f/3.5, north window soft light, exposure +0.5 EV airy and bright, shadows lifted RGB(40,38,36), neutral muted palette, face softly lit and clear, clean background generous space, Scandinavian minimal tone, ultra-clean zero noise, no text, no watermarks`,
};

// Sufixo global de qualidade aplicado a todos os prompts
const QUALITY_SUFFIX = `hyperrealistic, photorealistic, 8K resolution, ultra-detailed, sharp focus, well-exposed bright and clear, professional color grade, face fully visible and luminous, no underexposure, no dark shadows on face, no artifacts, no plastic skin, no blur, no text, no watermarks, no logos`;

function buildPrompt(subject: string, style: ImageStyle): string {
  const stylePrompt = PROMPTS[style] ?? PROMPTS.gemini;
  return `${subject}. ${stylePrompt}. ${QUALITY_SUFFIX}. Instagram 4:5 portrait format.`;
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

// Tamanho 4:5 real para Instagram (1024×1280px)
const FAL_SIZE_4x5 = { width: 1024, height: 1280 };

// ── fal.ai FLUX Schnell — rápido (5-10s) ────────────────────
async function fromFalSchnell(prompt: string, style: ImageStyle) {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY não configurada");

  const fullPrompt = buildPrompt(prompt, style);
  const res = await fetch("https://fal.run/fal-ai/flux/schnell", {
    method: "POST",
    headers: { "Authorization": `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: fullPrompt,
      image_size: FAL_SIZE_4x5,
      num_inference_steps: 8,
      num_images: 1,
      output_format: "jpeg",
      enable_safety_checker: false,
      sync_mode: true,
    }),
    signal: AbortSignal.timeout(35000),
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data.detail ?? data.error ?? `fal.ai Schnell HTTP ${res.status}`;
    console.error("[image] fal.ai Schnell falhou:", msg);
    throw new Error(msg);
  }

  const imageUrl = data.images?.[0]?.url;
  if (!imageUrl) throw new Error("fal.ai Schnell: sem imagem na resposta");

  console.log("[image] fal.ai FLUX Schnell OK");
  return { imageUrl, source: "fal-schnell" };
}

// ── fal.ai FLUX 1.1 Pro — alta qualidade (30-60s) ────────────
async function fromFal(prompt: string, style: ImageStyle) {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY não configurada");

  const fullPrompt = buildPrompt(prompt, style);
  const res = await fetch("https://fal.run/fal-ai/flux-pro/v1.1", {
    method: "POST",
    headers: { "Authorization": `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: fullPrompt,
      image_size: FAL_SIZE_4x5,
      num_images: 1,
      output_format: "jpeg",
      output_quality: 95,
      safety_tolerance: "5",
      sync_mode: true,
    }),
    signal: AbortSignal.timeout(70000),
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


// ── fal.ai InstantID — preservação facial premium (~40-60s) ─
async function fromFalInstantId(prompt: string, style: ImageStyle, refBase64: string, refMime: string) {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY não configurada");

  const styleHint = PROMPTS[style] ?? PROMPTS.gemini;
  const fullPrompt = `${prompt}. ${styleHint}. Portrait orientation 4:5 aspect ratio.`;
  const imageDataUrl = `data:${refMime};base64,${refBase64}`;

  const res = await fetch("https://fal.run/fal-ai/instant-id", {
    method: "POST",
    headers: { "Authorization": `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      face_image_url: imageDataUrl,
      prompt: fullPrompt,
      negative_prompt: "nsfw, nude, violence, low quality, blurry, distorted face, disfigured, deformed, plastic skin, cartoon, anime, painting, illustration, out of focus, grainy, overexposed, underexposed",
      num_inference_steps: 35,
      guidance_scale: 6,
      ip_adapter_scale: 0.85,
      controlnet_conditioning_scale: 0.85,
      enhance_face_region: true,
      image_size: FAL_SIZE_4x5,
      output_format: "jpeg",
      output_quality: 95,
      sync_mode: true,
    }),
    signal: AbortSignal.timeout(100000),
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data.detail ?? data.error ?? `fal.ai InstantID HTTP ${res.status}`;
    console.error("[image] fal.ai InstantID falhou:", msg);
    throw new Error(msg);
  }

  const imageUrl = data.images?.[0]?.url;
  if (!imageUrl) throw new Error("fal.ai InstantID: sem imagem na resposta");

  console.log("[image] fal.ai InstantID OK");
  return { imageUrl, source: "fal-instant-id" };
}

// ── fal.ai Clarity Upscaler — 2x resolução ───────────────────
async function upscaleImage(imageUrl: string, prompt = ""): Promise<string> {
  const key = process.env.FAL_KEY;
  if (!key) return imageUrl;
  // Só upscala URLs reais — data: URIs não são aceitas pelo upscaler
  if (imageUrl.startsWith("data:")) return imageUrl;

  try {
    const upscalePrompt = prompt
      ? `${prompt}, ultra-detailed skin pores, sharp hair strands, crisp fabric texture, 8K resolution, professional color grade, no noise, no artifacts`
      : `ultra-detailed skin pores, sharp hair strands, crisp fabric texture, 8K resolution, professional color grade, no noise, no artifacts`;

    const res = await fetch("https://fal.run/fal-ai/clarity-upscaler", {
      method: "POST",
      headers: { "Authorization": `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrl,
        scale_factor: 2,
        prompt: upscalePrompt,
        negative_prompt: "blurry, noise, artifacts, plastic skin, oversmoothed, cartoon, anime, illustration",
        creativity: 0.1,
        resemblance: 0.95,
        output_quality: 95,
        enable_safety_checker: false,
        sync_mode: true,
      }),
      signal: AbortSignal.timeout(60000),
    });

    const data = await res.json();
    if (!res.ok) {
      console.warn("[image] upscaler falhou:", data.detail ?? data.error);
      return imageUrl;
    }

    const upscaled = data.image?.url ?? data.images?.[0]?.url;
    if (upscaled) {
      console.log("[image] Clarity Upscaler 2x OK");
      return upscaled;
    }
    return imageUrl;
  } catch (e: any) {
    console.warn("[image] upscale exception:", e.message);
    return imageUrl;
  }
}

// ── fal.ai FLUX Kontext Pro — img2img preserva rosto ─────────
async function fromFalKontext(prompt: string, style: ImageStyle, refBase64: string, refMime: string) {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY não configurada");

  const styleHint = PROMPTS[style] ?? PROMPTS.gemini;
  const fullPrompt = `${prompt}. Keep the same person's face, identity, skin tone and facial features exactly as in the reference image. ${styleHint}. Portrait orientation 4:5 aspect ratio.`;

  const imageDataUrl = `data:${refMime};base64,${refBase64}`;

  const res = await fetch("https://fal.run/fal-ai/flux-pro/kontext", {
    method: "POST",
    headers: { "Authorization": `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: fullPrompt,
      image_url: imageDataUrl,
      guidance_scale: 4.0,
      num_inference_steps: 32,
      num_images: 1,
      image_size: FAL_SIZE_4x5,
      output_format: "jpeg",
      output_quality: 95,
      sync_mode: true,
    }),
    signal: AbortSignal.timeout(100000),
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data.detail ?? data.error ?? `fal.ai Kontext HTTP ${res.status}`;
    console.error("[image] fal.ai Kontext falhou:", msg);
    throw new Error(msg);
  }

  const imageUrl = data.images?.[0]?.url;
  if (!imageUrl) throw new Error("fal.ai Kontext: sem imagem na resposta");

  console.log("[image] fal.ai FLUX Kontext Pro OK");
  return { imageUrl, source: "fal-kontext" };
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

  const VALID_STYLES: ImageStyle[] = ["gemini", "foto_real", "cinematico", "editorial", "dark_mood", "vibrante", "minimalista"];
  const style: ImageStyle = VALID_STYLES.includes(imageStyle) ? imageStyle : "gemini";
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
    // Cascade com referência: InstantID (fidelidade máxima) → Kontext → OpenAI edits → fallback
    const tries: Array<() => Promise<ImageResult>> = [
      () => fromFalInstantId(enhancedPrompt, style, referenceImageBase64!, referenceImageMime!).then(r => { plan = "reference-instantid"; return r; }),
      () => fromFalKontext(enhancedPrompt, style, referenceImageBase64!, referenceImageMime!).then(r => { plan = "reference-kontext"; return r; }),
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

    // Upscaling automático 2x quando temos referência e URL real (não data:)
    if (result && !result.imageUrl.startsWith("data:") && result.source !== "pexels" && result.source !== "google") {
      result.imageUrl = await upscaleImage(result.imageUrl, enhancedPrompt);
    }
  } else if (!isPro) {
    // Schnell primeiro (3-8s) → Pro como fallback de qualidade → busca web
    const tries: Array<() => Promise<ImageResult>> = [
      () => fromFalSchnell(enhancedPrompt, style).then(r => { plan = "free"; return r; }),
      () => fromFal(enhancedPrompt, style).then(r => { plan = "free"; return r; }),
      () => fromOpenAI(enhancedPrompt, style).then(r => { plan = "free"; return r; }),
      () => fromGoogleImages(prompt).then(r => { plan = "free_fallback"; return r; }),
      () => fromPexels(prompt).then(r => { plan = "free_fallback"; return r; }),
    ];
    for (const fn of tries) {
      if (result) break;
      try { result = await fn(); } catch (e: any) { errors.push(e.message); }
    }
  } else {
    // Pro: Schnell rápido → Pro alta qualidade → OpenAI → OpenRouter → busca web
    const tries: Array<() => Promise<ImageResult>> = [
      () => fromFalSchnell(enhancedPrompt, style).then(r => { plan = "pro"; return r; }),
      () => fromFal(enhancedPrompt, style).then(r => { plan = "pro"; return r; }),
      () => fromOpenAI(enhancedPrompt, style).then(r => { plan = "pro"; return r; }),
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

  return NextResponse.json({ ...result, plan, ...(errors.length ? { fallbackErrors: errors } : {}) });
}
