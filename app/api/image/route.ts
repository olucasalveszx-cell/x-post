import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/stripe";
import { verifyToken } from "@/lib/activation";
import { isEmailActive } from "@/lib/kv";
import { stripe } from "@/lib/stripe";

export const maxDuration = 45;

type ImageStyle = "realista" | "cinematico" | "stock" | "cartoon" | "anime" | "abstrato" | "foto_real";

interface StyleConfig {
  prompt: string;
  base: string; // instrução de fundo/composição específica do estilo
}

const STYLES: Record<ImageStyle, StyleConfig> = {
  realista: {
    prompt: `ultra-realistic photography, shot on Canon EOS R5 with 85mm f/1.4 lens, natural golden-hour lighting, shallow depth of field with sharp subject focus, accurate human anatomy with perfectly proportioned limbs and faces, photojournalism quality, rich textures and fine details, true-to-life skin tones, authentic candid emotion, 8K resolution, HDR tonal range`,
    base: `natural background with soft bokeh, warm color grading, no distortions, no warping, anatomically correct proportions, no text, no watermarks, no logos`,
  },
  cinematico: {
    prompt: `cinematic movie still, shot by Roger Deakins, dramatic three-point lighting with strong shadows and highlights, anamorphic lens compression, film grain texture, epic wide-aspect framing, deep contrast ratio, rich color grading inspired by Blade Runner 2049 and Dune, atmospheric haze and volumetric light rays, hyper-detailed production design, IMAX 70mm film quality`,
    base: `dark moody background, teal and orange color palette, perfectly composed frame, no distortions, no warping, no text, no watermarks, no logos`,
  },
  stock: {
    prompt: `professional stock photography, clean bright studio environment, soft box high-key lighting from three sides, sharp focus throughout frame, polished corporate editorial aesthetic, confident subjects with natural genuine expressions, perfectly balanced composition following rule of thirds, Getty Images and Shutterstock quality, business professional setting, crisp white or neutral background`,
    base: `bright clean background, neutral tones, perfectly proportioned figures, no distortions, no warping, no text, no watermarks, no logos`,
  },
  cartoon: {
    prompt: `vibrant 2D cartoon illustration, clean bold outlines, flat colors with subtle cel shading, Disney and Pixar animation quality, expressive simplified character design with large eyes and clear emotions, smooth clean vector curves, balanced color palette with primary and complementary colors, professional illustration composition, charming and friendly visual style`,
    base: `solid or simple gradient background, clean linework, no photorealism, no 3D rendering artifacts, no distortions, perfectly drawn proportions, no text, no watermarks, no logos`,
  },
  anime: {
    prompt: `high-quality anime illustration, Studio Ghibli and Makoto Shinkai artistic style, detailed clean linework with precise inking, vibrant saturated colors with detailed shading and highlights, expressive character faces with large detailed eyes, dramatic sky with volumetric clouds, detailed environmental storytelling, professional manga-quality artwork, dynamic composition with strong focal point`,
    base: `anime-style detailed background, rich saturated palette, perfectly drawn anatomy in anime proportion style, clean lines without artifacts, no photorealism, no text, no watermarks, no logos`,
  },
  abstrato: {
    prompt: `premium abstract digital artwork, no human figures, sophisticated geometric and organic shape composition, fluid metallic and neon elements, deep layered visual complexity, award-winning generative art aesthetic, balanced asymmetric composition, rich contrast between dark and luminous elements, futuristic data-visualization inspired design, professional digital fine art quality, vivid color harmony`,
    base: `deep dark background with glowing elements, multiple color layers with depth, perfectly balanced composition, no faces or people, no text, no watermarks, no logos`,
  },
  foto_real: {
    prompt: `real photograph`,
    base: `no text, no watermarks, no logos`,
  },
};

function buildPrompt(subject: string, style: ImageStyle): string {
  const cfg = STYLES[style] ?? STYLES.cinematico;
  return `${subject}. ${cfg.prompt}. Portrait orientation 4:5 aspect ratio, single cohesive composition. ${cfg.base}.`;
}

// ── Imagen 4 (máxima qualidade — usado no estilo Realista) ───
async function fromImagen4(prompt: string, style: ImageStyle) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY não configurada");

  const fullPrompt = buildPrompt(prompt, style);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${key}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt: fullPrompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: "3:4",
        safetyFilterLevel: "block_few",
        personGeneration: "allow_adult",
      },
    }),
    signal: AbortSignal.timeout(50000),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? `Imagen4 HTTP ${res.status}`);

  const pred = data.predictions?.[0];
  if (!pred?.bytesBase64Encoded) throw new Error("Imagen4: sem imagem na resposta");

  console.log("[image] Imagen 4 OK");
  return { imageUrl: `data:${pred.mimeType ?? "image/png"};base64,${pred.bytesBase64Encoded}`, source: "imagen4" };
}

// ── Imagen 3 (fallback, via Gemini API key) ───────────────────
async function fromImagen3(prompt: string, style: ImageStyle) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY não configurada");

  const fullPrompt = buildPrompt(prompt, style);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${key}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt: fullPrompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: "3:4",
        safetyFilterLevel: "block_few",
        personGeneration: "allow_adult",
      },
    }),
    signal: AbortSignal.timeout(40000),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? `Imagen3 HTTP ${res.status}`);

  const pred = data.predictions?.[0];
  if (!pred?.bytesBase64Encoded) throw new Error("Imagen3: sem imagem na resposta");

  console.log("[image] Imagen 3 OK");
  return { imageUrl: `data:${pred.mimeType ?? "image/png"};base64,${pred.bytesBase64Encoded}`, source: "imagen3" };
}

// ── Gemini 2.0 Flash Image Generation (fallback) ─────────────
async function fromGemini(prompt: string, style: ImageStyle) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY não configurada");

  const fullPrompt = buildPrompt(prompt, style);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${key}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    }),
    signal: AbortSignal.timeout(40000),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? `Gemini HTTP ${res.status}`);

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p: any) => p.inlineData);
  if (!imagePart?.inlineData) throw new Error("Gemini: sem imagem na resposta");

  const { data: b64, mimeType } = imagePart.inlineData;
  console.log("[image] Gemini 2.0 Flash OK");
  return { imageUrl: `data:${mimeType};base64,${b64}`, source: "gemini" };
}

// ── Gemini com imagem de referência ──────────────────────────
async function fromGeminiWithReference(prompt: string, style: ImageStyle, refBase64: string, refMime: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY não configurada");

  const cfg = STYLES[style] ?? STYLES.cinematico;
  const styleGuide = `${cfg.prompt}. ${cfg.base}`;

  const textInstruction = `Use this image as a visual reference and style inspiration. Transform it into a stylized Instagram carousel slide background with the following direction: "${prompt}". Apply this style: ${styleGuide}. Portrait orientation 4:5 aspect ratio. Maintain the essence and mood of the reference image but adapt it to a cinematic, high-quality Instagram aesthetic. No text, no watermarks.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${key}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inlineData: { mimeType: refMime, data: refBase64 } },
          { text: textInstruction },
        ],
      }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    }),
    signal: AbortSignal.timeout(45000),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? `Gemini HTTP ${res.status}`);

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p: any) => p.inlineData);
  if (!imagePart?.inlineData) throw new Error("Gemini: sem imagem na resposta");

  const { data: b64, mimeType } = imagePart.inlineData;
  console.log("[image] Gemini reference OK");
  return { imageUrl: `data:${mimeType};base64,${b64}`, source: "gemini_ref" };
}

// ── DALL-E 3 ─────────────────────────────────────────────────
async function fromDallE(prompt: string, style: ImageStyle) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY não configurada");

  const fullPrompt = buildPrompt(prompt, style);

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: fullPrompt,
      n: 1,
      size: "1024x1792",
      quality: "standard",
      response_format: "b64_json",
    }),
    signal: AbortSignal.timeout(40000),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? `DALL-E HTTP ${res.status}`);

  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("DALL-E: sem imagem na resposta");

  console.log("[image] DALL-E 3 OK");
  return { imageUrl: `data:image/png;base64,${b64}`, source: "dalle" };
}

// ── Google Images via Serper ──────────────────────────────────
async function fromSerper(prompt: string) {
  const key = process.env.SERPER_API_KEY;
  if (!key) throw new Error("SERPER_API_KEY não configurada");

  // Adiciona "foto" para forçar resultados fotográficos reais
  const query = `${prompt} foto`;

  const res = await fetch("https://google.serper.dev/images", {
    method: "POST",
    headers: { "X-API-KEY": key, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, gl: "br", hl: "pt", num: 10 }),
    signal: AbortSignal.timeout(15000),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? `Serper HTTP ${res.status}`);

  const images: any[] = data.images ?? [];
  if (!images.length) throw new Error("Serper: sem imagens encontradas");

  // Prefere imagens com boa resolução (≥ 600px), filtra ícones/logos
  const sorted = images
    .filter(img => img.imageUrl && img.imageWidth >= 400 && img.imageHeight >= 400)
    .sort((a, b) => (b.imageWidth * b.imageHeight) - (a.imageWidth * a.imageHeight));

  const candidates = sorted.length > 0 ? sorted : images;

  for (const img of candidates.slice(0, 8)) {
    if (!img.imageUrl) continue;
    try {
      const imgRes = await fetch(img.imageUrl, {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
      });
      if (!imgRes.ok) continue;

      const ct = imgRes.headers.get("content-type") ?? "";
      if (!ct.startsWith("image/")) continue;

      const buffer = await imgRes.arrayBuffer();
      if (buffer.byteLength < 20_000) continue; // descarta ícones pequenos (<20KB)

      const b64 = Buffer.from(buffer).toString("base64");
      console.log("[image] Serper OK:", img.imageUrl, `${img.imageWidth}x${img.imageHeight}`);
      return { imageUrl: `data:${ct};base64,${b64}`, source: "serper" };
    } catch {
      continue;
    }
  }
  throw new Error("Serper: não foi possível baixar nenhuma imagem válida");
}

// ── Pexels (fallback final) ───────────────────────────────────
async function fromPexels(prompt: string) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) throw new Error("PEXELS_API_KEY não configurada");

  const query = prompt
    .split(/[,.|]/)[0]
    .replace(/<[^>]+>/g, "")
    .replace(/[^\w\sÀ-ÿ]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .join(" ") || "technology business";

  const page = Math.ceil(Math.random() * 3);
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=portrait&per_page=15&page=${page}`,
    { headers: { Authorization: key } },
  );
  if (!res.ok) throw new Error(`Pexels HTTP ${res.status}`);

  const data = await res.json();
  let photos = data.photos ?? [];

  if (!photos.length) {
    const res2 = await fetch(
      `https://api.pexels.com/v1/search?query=business&orientation=portrait&per_page=15&page=1`,
      { headers: { Authorization: key } },
    );
    const d2 = await res2.json();
    photos = d2.photos ?? [];
  }

  if (!photos.length) throw new Error("Pexels: sem resultados");

  const photo = photos[Math.floor(Math.random() * photos.length)];
  return { imageUrl: photo.src?.large2x ?? photo.src?.original, source: "pexels" };
}

// ── Handler principal ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { prompt, imageStyle = "cinematico", customerId, activationToken, referenceImageBase64, referenceImageMime } = await req.json();
  if (!prompt) return NextResponse.json({ error: "prompt obrigatório" }, { status: 400 });

  const hasReference = !!(referenceImageBase64 && referenceImageMime);

  // Foto Real → busca no Google (disponível para todos, Pro e Free)
  if (imageStyle === "foto_real") {
    try {
      return NextResponse.json({ ...await fromSerper(prompt), plan: "real" });
    } catch (e: any) {
      console.error("[image] Serper falhou:", e.message);
      try {
        return NextResponse.json({ ...await fromPexels(prompt), plan: "real_fallback" });
      } catch (e2: any) {
        return NextResponse.json({ error: e2.message }, { status: 500 });
      }
    }
  }

  let isPro = false;

  // 1. Sessão Google (server-side)
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (email) {
    const kirvano = await isEmailActive(email).catch(() => false);
    if (kirvano) {
      isPro = true;
    } else {
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (customers.data.length > 0) {
        isPro = await hasActiveSubscription(customers.data[0].id);
      }
    }
  }

  // 2. Fallback: customerId Stripe
  if (!isPro && customerId) isPro = await hasActiveSubscription(customerId);

  // 3. Fallback: token Kirvano
  if (!isPro && activationToken) {
    const { valid } = verifyToken(activationToken);
    isPro = valid;
  }

  // Plano gratuito → Pexels
  if (!isPro) {
    try {
      return NextResponse.json({ ...await fromPexels(prompt), plan: "free" });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Plano Pro com imagem de referência → Gemini multimodal → fallbacks normais
  const errors: string[] = [];
  const style = imageStyle as ImageStyle;

  if (hasReference) {
    try {
      return NextResponse.json({ ...await fromGeminiWithReference(prompt, style, referenceImageBase64, referenceImageMime), plan: "pro_ref" });
    } catch (e: any) {
      errors.push(`GeminiRef: ${e.message}`);
      console.error("[image] GeminiRef falhou:", e.message);
    }
  }

  // Realista → Imagen 4 primeiro (maior qualidade fotorrealista)
  if (style === "realista") {
    try {
      return NextResponse.json({ ...await fromImagen4(prompt, style), plan: "pro" });
    } catch (e: any) {
      errors.push(`Imagen4: ${e.message}`);
      console.error("[image] Imagen4 falhou, tentando Imagen3:", e.message);
    }
  }

  // Demais estilos (ou fallback do Realista) → Imagen 3 → Gemini → DALL-E → Pexels
  try {
    return NextResponse.json({ ...await fromImagen3(prompt, style), plan: "pro" });
  } catch (e: any) {
    errors.push(`Imagen3: ${e.message}`);
    console.error("[image] Imagen3 falhou:", e.message);
  }

  try {
    return NextResponse.json({ ...await fromGemini(prompt, style), plan: "pro" });
  } catch (e: any) {
    errors.push(`Gemini: ${e.message}`);
    console.error("[image] Gemini falhou:", e.message);
  }

  try {
    return NextResponse.json({ ...await fromDallE(prompt, style), plan: "pro" });
  } catch (e: any) {
    errors.push(`DALL-E: ${e.message}`);
    console.error("[image] DALL-E falhou:", e.message);
  }

  try {
    return NextResponse.json({ ...await fromPexels(prompt), plan: "pro_fallback" });
  } catch (e: any) {
    errors.push(`Pexels: ${e.message}`);
    return NextResponse.json({ error: errors.join(" | ") }, { status: 500 });
  }
}
