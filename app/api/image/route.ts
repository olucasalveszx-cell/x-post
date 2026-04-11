import { NextRequest, NextResponse } from "next/server";
import { hasActiveSubscription } from "@/lib/stripe";
import { verifyToken } from "@/lib/activation";

export const maxDuration = 45;

type ImageStyle = "realista" | "cinematico" | "stock" | "cartoon" | "anime" | "abstrato";

const STYLE_PROMPTS: Record<ImageStyle, string> = {
  realista:   "ultra-realistic photography, natural lighting, shallow depth of field, sharp focus, 8k DSLR photo, photojournalism quality, authentic emotion, no text",
  cinematico: "cinematic still, dramatic moody lighting, film grain, anamorphic lens flare, dark atmospheric, hyper-detailed, IMAX quality, vibrant color grading, no text",
  stock:      "professional stock photography, clean bright studio lighting, corporate editorial style, high-key lighting, sharp and polished, Getty Images quality, no text",
  cartoon:    "vibrant cartoon illustration, bold outlines, flat colors with cel shading, Disney/Pixar style, expressive characters, clean vector art, no text",
  anime:      "anime illustration style, manga aesthetic, studio Ghibli quality, detailed linework, vivid colors, dramatic sky, Japanese animation, no text",
  abstrato:   "abstract digital art, geometric shapes, neon color palette, fluid dynamics, futuristic data visualization, award-winning generative art, no text",
};

// Tenta vários modelos de imagem Gemini em ordem
const GEMINI_MODELS = [
  "gemini-2.5-flash-image",
  "gemini-3.1-flash-image-preview",
  "gemini-2.0-flash-exp-image-generation",
];

async function fromGemini(prompt: string, style: ImageStyle) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY não configurada");

  const stylePrompt = STYLE_PROMPTS[style] ?? STYLE_PROMPTS.cinematico;
  const fullPrompt = `${prompt}. Style: ${stylePrompt}. Portrait orientation 4:5, dark moody background, high contrast, dramatic lighting, cinematic composition, no watermarks, no text overlays, no logos. Generate exactly what is described in the prompt — be literal and specific.`;

  let lastErr = "";
  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
        }),
        signal: AbortSignal.timeout(40000),
      });

      const data = await res.json();
      if (!res.ok) {
        lastErr = data.error?.message ?? res.statusText;
        console.log(`[image] ${model} falhou: ${lastErr}`);
        continue;
      }

      const parts = data.candidates?.[0]?.content?.parts ?? [];
      const imagePart = parts.find((p: any) => p.inlineData);
      if (!imagePart?.inlineData) {
        lastErr = `${model}: sem imagem na resposta`;
        continue;
      }

      const { data: b64, mimeType } = imagePart.inlineData;
      console.log(`[image] ${model} OK`);
      return { imageUrl: `data:${mimeType};base64,${b64}`, source: model };
    } catch (e: any) {
      lastErr = e.message;
      console.log(`[image] ${model} erro: ${e.message}`);
    }
  }
  throw new Error(`Gemini indisponível: ${lastErr}`);
}

async function fromPexels(prompt: string) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) throw new Error("PEXELS_API_KEY não configurada");

  const query = prompt.split(/[,.|]/)[0].replace(/<[^>]+>/g, "").replace(/[^\w\sÀ-ÿ]/g, "").trim().split(/\s+/).slice(0, 5).join(" ") || "technology business";

  const page = Math.ceil(Math.random() * 3);
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=portrait&per_page=15&page=${page}`,
    { headers: { Authorization: key } }
  );
  if (!res.ok) throw new Error(`Pexels HTTP ${res.status}`);
  const data = await res.json();
  let photos = data.photos ?? [];
  if (!photos.length) {
    const res2 = await fetch(`https://api.pexels.com/v1/search?query=business&orientation=portrait&per_page=15&page=1`, { headers: { Authorization: key } });
    const d2 = await res2.json();
    photos = d2.photos ?? [];
  }
  if (!photos.length) throw new Error("Pexels: sem resultados");
  const photo = photos[Math.floor(Math.random() * photos.length)];
  return { imageUrl: photo.src?.large2x ?? photo.src?.original, source: "pexels" };
}

export async function POST(req: NextRequest) {
  const { prompt, imageStyle = "cinematico", customerId, activationToken } = await req.json();
  if (!prompt) return NextResponse.json({ error: "prompt obrigatório" }, { status: 400 });

  // Verifica Pro via Stripe ou via token Kirvano
  let isPro = false;
  if (customerId) {
    isPro = await hasActiveSubscription(customerId);
  } else if (activationToken) {
    const { valid } = verifyToken(activationToken);
    isPro = valid;
  }

  if (!isPro) {
    // Plano gratuito → Pexels
    try {
      const result = await fromPexels(prompt);
      return NextResponse.json({ ...result, plan: "free" });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Plano Pro → Gemini com fallback para Pexels
  try {
    const result = await fromGemini(prompt, imageStyle as ImageStyle);
    return NextResponse.json({ ...result, plan: "pro" });
  } catch (geminiErr: any) {
    console.error("[image] Gemini falhou, tentando Pexels:", geminiErr.message);
    try {
      const result = await fromPexels(prompt);
      return NextResponse.json({ ...result, plan: "pro_fallback" });
    } catch (pexelsErr: any) {
      console.error("[image] Pexels também falhou:", pexelsErr.message);
      return NextResponse.json({ error: geminiErr.message }, { status: 500 });
    }
  }
}
