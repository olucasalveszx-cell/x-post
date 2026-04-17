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
  base: string;
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
    prompt: `ultra-realistic documentary photograph, shot on full-frame DSLR, natural available light, sharp focus, authentic candid moment, photojournalism quality, true-to-life colors, no retouching, real life scene`,
    base: `natural real-world background, authentic environment, no studio setup, no artistic filters, no text, no watermarks, no logos`,
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

// ── Imagen 3 ──────────────────────────────────────────────────
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

// ── Gemini 2.0 Flash Image Generation ────────────────────────
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

// ── Handler principal ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { prompt, imageStyle = "cinematico", customerId, activationToken, referenceImageBase64, referenceImageMime } = await req.json();
  if (!prompt) return NextResponse.json({ error: "prompt obrigatório" }, { status: 400 });

  const hasReference = !!(referenceImageBase64 && referenceImageMime);
  const style: ImageStyle = (imageStyle as ImageStyle) in STYLES ? (imageStyle as ImageStyle) : "cinematico";

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

  // Plano gratuito → Gemini 2.0 Flash
  if (!isPro) {
    try {
      return NextResponse.json({ ...await fromGemini(prompt, style), plan: "free" });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Plano Pro com imagem de referência → Gemini multimodal → fallbacks normais
  const errors: string[] = [];

  if (hasReference) {
    try {
      return NextResponse.json({ ...await fromGeminiWithReference(prompt, style, referenceImageBase64, referenceImageMime), plan: "pro_ref" });
    } catch (e: any) {
      errors.push(`GeminiRef: ${e.message}`);
      console.error("[image] GeminiRef falhou:", e.message);
    }
  }

  // Realista e Foto Real → Imagen 4 (maior qualidade fotorrealista)
  if (style === "realista" || style === "foto_real") {
    try {
      return NextResponse.json({ ...await fromImagen4(prompt, style), plan: "pro" });
    } catch (e: any) {
      errors.push(`Imagen4: ${e.message}`);
      console.error("[image] Imagen4 falhou, tentando Imagen3:", e.message);
    }
  }

  // Demais estilos (ou fallback do Realista) → Imagen 3 → Gemini
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
    return NextResponse.json({ error: errors.join(" | ") }, { status: 500 });
  }
}
