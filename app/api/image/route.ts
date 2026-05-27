import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyToken } from "@/lib/activation";
import { getUserPlan } from "@/lib/credits";
import { redisGet, redisSet, redisIncr, redisLPush, redisLTrim } from "@/lib/redis";
import { put } from "@vercel/blob";
import { geminiText, geminiVision } from "@/lib/gemini-text";

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

// Detecta gênero/aparência da pessoa na foto de referência para usar nos prompts
async function detectPersonDescription(base64: string, mime: string): Promise<string> {
  try {
    const desc = await geminiVision(
      `Look at this photo and describe the person in 4-6 words. Focus on: gender (man/woman/boy/girl), approximate age range, and one visible trait (hair color/ethnicity). Examples: "adult man dark hair", "young woman blonde hair", "middle-aged man". Return ONLY those 4-6 words, nothing else.`,
      base64,
      mime,
      { maxTokens: 20, temperature: 0.1 }
    );
    const clean = desc.trim().toLowerCase().replace(/[^a-z\s-]/g, "").trim();
    return clean || "person";
  } catch {
    return "person";
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

// Hint de estilo simplificado para modelos de identidade facial
const FACE_STYLE_HINT = `photorealistic, well-lit natural daylight, warm skin tones accurate, face fully visible and bright, no shadows on face, clean background, 8K sharp, no text, no watermarks`;

// Prompt obrigatório de preservação de identidade — incluído em TODOS os métodos de face
const FACE_IDENTITY_PROMPT = `Use the reference face exactly as provided. Preserve identity, facial structure, eyes, nose, mouth, jawline, skin tone, proportions, age and expression. Do not beautify. Do not change ethnicity. Do not generate a different person. The face must remain identical to the reference image.`;

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
async function fromFalSchnell(prompt: string, style: ImageStyle, inferenceSteps = 8) {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY não configurada");

  const fullPrompt = buildPrompt(prompt, style);
  const res = await fetch("https://fal.run/fal-ai/flux/schnell", {
    method: "POST",
    headers: { "Authorization": `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: fullPrompt,
      image_size: FAL_SIZE_4x5,
      num_inference_steps: inferenceSteps,
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

  const fullPrompt = `${prompt}. ${FACE_IDENTITY_PROMPT} ${FACE_STYLE_HINT}. Portrait orientation 4:5 aspect ratio.`;
  const imageDataUrl = `data:${refMime};base64,${refBase64}`;

  console.log(`[image] InstantID: ref=${refMime} ${Math.round(refBase64.length * 0.75 / 1024)}KB prompt="${prompt.slice(0, 60)}"`);

  const res = await fetch("https://fal.run/fal-ai/instant-id", {
    method: "POST",
    headers: { "Authorization": `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      face_image_url: imageDataUrl,
      prompt: fullPrompt,
      negative_prompt: "different person, changed identity, nsfw, nude, violence, low quality, blurry, distorted face, disfigured, deformed, plastic skin, cartoon, anime, painting, illustration, out of focus, grainy, overexposed, underexposed, sunglasses, hat, mask",
      num_inference_steps: 50,
      guidance_scale: 5.0,
      ip_adapter_scale: 0.85,
      controlnet_conditioning_scale: 0.8,
      enhance_face_region: true,
      image_size: FAL_SIZE_4x5,
      output_format: "jpeg",
      output_quality: 95,
      sync_mode: true,
    }),
    signal: AbortSignal.timeout(65000),
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

// ── fal.ai PuLID — identidade forte via injeção direta no FLUX ──────────
async function fromFalPulid(prompt: string, style: ImageStyle, refBase64: string, refMime: string) {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY não configurada");

  const fullPrompt = `${prompt}. ${FACE_IDENTITY_PROMPT} ${FACE_STYLE_HINT}. Portrait orientation 4:5.`;
  const imageDataUrl = `data:${refMime};base64,${refBase64}`;

  console.log(`[image] PuLID: ref=${refMime} ${Math.round(refBase64.length * 0.75 / 1024)}KB`);

  const res = await fetch("https://fal.run/fal-ai/pulid", {
    method: "POST",
    headers: { "Authorization": `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: fullPrompt,
      negative_prompt: "different person, changed identity, nsfw, nude, violence, low quality, blurry, distorted face, disfigured, deformed, plastic skin, cartoon, anime, painting, out of focus, grainy, overexposed, sunglasses, hat, mask",
      id_image: imageDataUrl,
      num_inference_steps: 35,
      guidance_scale: 2.0,
      true_cfg: 4.0,
      image_size: FAL_SIZE_4x5,
      sync_mode: true,
    }),
    signal: AbortSignal.timeout(60000),
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data.detail ?? data.error ?? `fal.ai PuLID HTTP ${res.status}`;
    console.error("[image] fal.ai PuLID falhou:", msg);
    throw new Error(msg);
  }

  const imageUrl = data.images?.[0]?.url;
  if (!imageUrl) throw new Error("fal.ai PuLID: sem imagem na resposta");

  console.log("[image] fal.ai PuLID OK");
  return { imageUrl, source: "fal-pulid" };
}

// ── Garante URL pública — converte data: URI para Vercel Blob se necessário ──
async function ensurePublicUrl(imageUrl: string, label = "img"): Promise<string> {
  if (!imageUrl.startsWith("data:")) return imageUrl;
  try {
    const [header, b64] = imageUrl.split(",");
    const mimeType = header.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";
    const ext = mimeType.split("/")[1]?.split("+")[0] ?? "jpg";
    const buffer = Buffer.from(b64, "base64");
    const blob = await put(
      `faceswap/${label}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`,
      buffer,
      { access: "public" as any, contentType: mimeType }
    );
    console.log(`[image] ensurePublicUrl: data: URI → ${blob.url.slice(0, 60)}`);
    return blob.url;
  } catch (e: any) {
    console.error("[image] ensurePublicUrl falhou:", e.message);
    throw new Error("Não foi possível fazer upload da cena para face-swap");
  }
}

// ── fal.ai Face Swap — copia pixels reais do rosto (método mais fiel) ───
async function fromFalFaceSwap(sceneUrl: string, refBase64: string, refMime: string): Promise<string> {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY não configurada");

  // base_image_url DEVE ser URL pública — nunca aceita data: URI
  // swap_image_url aceita data: URI (rosto da referência)
  const refDataUrl = `data:${refMime};base64,${refBase64}`;

  console.log(`[image] FaceSwap: cena=${sceneUrl.slice(0, 60)} ref=${refMime} ${Math.round(refBase64.length * 0.75 / 1024)}KB`);

  const res = await fetch("https://fal.run/fal-ai/face-swap", {
    method: "POST",
    headers: { "Authorization": `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      base_image_url: sceneUrl,
      swap_image_url: refDataUrl,
      sync_mode: true,
    }),
    signal: AbortSignal.timeout(60000),
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data.detail ?? data.error ?? `fal.ai Face Swap HTTP ${res.status}`;
    console.error("[image] fal.ai Face Swap falhou:", msg);
    throw new Error(msg);
  }

  const imageUrl = data.image?.url ?? data.images?.[0]?.url;
  if (!imageUrl) throw new Error("fal.ai Face Swap: sem imagem na resposta");

  console.log("[image] fal.ai Face Swap OK →", imageUrl.slice(0, 60));
  return imageUrl;
}

// ── Cena + Face Swap — MÉTODO PRIMÁRIO de fidelidade facial ──────────────
// Gera cena com corpo/ambiente, depois copia pixels exatos do rosto da referência
async function fromSceneAndSwap(prompt: string, style: ImageStyle, refBase64: string, refMime: string) {
  // Cena: rosto frontal grande no quadrante superior, cabeça e ombros, iluminação frontal neutra
  // Essencial para o face-swap ter uma região de rosto clara para substituir
  const scenePrompt = [
    prompt,
    "PORTRAIT PHOTO",
    "ONE PERSON facing directly toward camera",
    "LARGE FACE in UPPER 40% of frame (face occupying at least 30% of image height)",
    "head and shoulders composition",
    "frontal face clearly visible — eyes, nose, mouth all facing forward",
    "neutral front lighting, no side shadows obscuring face",
    "photorealistic, natural lighting, 8K sharp",
    "lower half of frame shows body/background only",
  ].join(", ");

  const scene = await fromFalSchnell(scenePrompt, style, 35);

  // Converte data: URI para URL pública antes do face-swap (fal.ai exige URL real)
  const sceneUrl = await ensurePublicUrl(scene.imageUrl, "scene");

  const swapped = await fromFalFaceSwap(sceneUrl, refBase64, refMime);
  console.log("[image] Cena+FaceSwap pipeline OK");
  return { imageUrl: swapped, source: "fal-scene-swap" };
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
  const fullPrompt = `${prompt}. ${FACE_IDENTITY_PROMPT} ${styleHint}. Portrait orientation 4:5 aspect ratio.`;

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

  // Try each candidate until one proxies successfully (CORS protection on many sites)
  const candidates = items.slice(0, 5);
  for (const candidate of candidates) {
    try {
      const imgRes = await fetch(candidate.link, {
        signal: AbortSignal.timeout(6000),
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Referer": "https://www.google.com/",
          "Accept": "image/*,*/*;q=0.8",
        },
      });
      if (!imgRes.ok) continue;
      const ct = imgRes.headers.get("content-type") ?? "";
      if (!ct.startsWith("image/")) continue;
      const buffer = await imgRes.arrayBuffer();
      if (buffer.byteLength < 5000) continue;
      const ext = ct.split("/")[1]?.split("+")[0] ?? "jpg";
      const blob = await put(
        `gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`,
        Buffer.from(buffer),
        { access: "public" as any, contentType: ct.split(";")[0] }
      );
      console.log("[image] Google Images + Blob OK");
      return { imageUrl: blob.url, source: "google" };
    } catch { continue; }
  }
  throw new Error("Google Images: nenhuma imagem pôde ser baixada");
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

  // Em modo com rosto: skip enhancePrompt (destrói instruções de face preservation)
  const [enhancedPrompt, session, personDesc] = await Promise.all([
    hasReference ? Promise.resolve(prompt) : enhancePrompt(prompt),
    getServerSession(authOptions),
    hasReference
      ? detectPersonDescription(referenceImageBase64!, referenceImageMime!)
      : Promise.resolve("person"),
  ]);

  // Extrai só a cena curta do prompt — suporta o novo formato "Create a realistic image..."
  // e o formato antigo "photorealistic portrait of a X: ..."
  const rawSceneShort = prompt
    .replace(/^Create a realistic image of a person in the following scenario:\s*/i, "")
    .replace(/\n\nThe person MUST[\s\S]*$/i, "")
    .replace(/^photorealistic portrait of a [^:]+:\s*/i, "")
    .trim()
    .slice(0, 150);

  const facePrompt = hasReference
    ? `${personDesc}, ${rawSceneShort || prompt.slice(0, 100)}, facing camera, photorealistic`
    : prompt;

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
    // ── Pipeline de fidelidade facial (SOMENTE métodos com referência real) ──
    // NUNCA cair em geração textual pura — isso geraria pessoa aleatória.
    //
    // Ordem por fidelidade REAL (não por "qualidade visual"):
    // 1. Scene+FaceSwap — ÚNICO método pixel-accurate: copia rosto exato da foto
    //    → gera cena com corpo/ambiente, depois substitui pixels do rosto
    // 2. PuLID — injeção de identidade direta no FLUX (boa mas não pixel-perfect)
    // 3. InstantID — ControlNet + IP-Adapter (pode derivar ligeiramente)
    // 4. Kontext — img2img editando a própria foto de referência
    // 5. OpenAI edits com referência — última opção real com preservação
    //
    // Se TODOS falharem → erro explícito (não gera pessoa aleatória)
    console.log(`[image] face-pipeline START: ref=${referenceImageMime} ${Math.round((referenceImageBase64?.length ?? 0) * 0.75 / 1024)}KB prompt="${facePrompt.slice(0, 80)}"`);

    const faceTries: Array<{ label: string; fn: () => Promise<ImageResult> }> = [
      { label: "faceswap", fn: () => fromSceneAndSwap(facePrompt, style, referenceImageBase64!, referenceImageMime!).then(r => { plan = "reference-faceswap"; return r; }) },
      { label: "pulid",    fn: () => fromFalPulid(facePrompt, style, referenceImageBase64!, referenceImageMime!).then(r => { plan = "reference-pulid"; return r; }) },
      { label: "instantid",fn: () => fromFalInstantId(facePrompt, style, referenceImageBase64!, referenceImageMime!).then(r => { plan = "reference-instantid"; return r; }) },
      { label: "kontext",  fn: () => fromFalKontext(facePrompt, style, referenceImageBase64!, referenceImageMime!).then(r => { plan = "reference-kontext"; return r; }) },
      { label: "openai-ref",fn: () => fromOpenAIWithReference(facePrompt, style, referenceImageBase64!, referenceImageMime!).then(r => { plan = "reference"; return r; }) },
    ];

    for (const { label, fn } of faceTries) {
      if (result) break;
      try {
        console.log(`[image] face-pipeline tentando: ${label}`);
        result = await fn();
        console.log(`[image] face-pipeline SUCCESS: ${label}`);
      } catch (e: any) {
        console.warn(`[image] face-pipeline FALHOU ${label}:`, e.message);
        errors.push(`${label}: ${e.message}`);
      }
    }

    if (!result) {
      console.error("[image] face-pipeline: TODOS os métodos falharam:", errors);
      return NextResponse.json({
        error: "Esta API não suporta fidelidade facial real para esta foto. Verifique: rosto frontal, boa iluminação, sem óculos escuros, somente uma pessoa. Erros: " + errors.slice(0, 2).join(" | "),
        faceErrors: errors,
      }, { status: 422 });
    }

    // Sem upscaling no modo com rosto — pipeline já usa ~60-90s, upscaling estouraria os 120s do Vercel
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
