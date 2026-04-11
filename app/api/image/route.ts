import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/stripe";
import { verifyToken } from "@/lib/activation";
import { isEmailActive } from "@/lib/kv";
import { stripe } from "@/lib/stripe";

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

// ── Together AI (FLUX.1) ────────────────────────────────────
async function fromTogether(prompt: string, style: ImageStyle) {
  const key = process.env.TOGETHER_API_KEY;
  if (!key) throw new Error("TOGETHER_API_KEY não configurada");

  const stylePrompt = STYLE_PROMPTS[style] ?? STYLE_PROMPTS.cinematico;
  const fullPrompt = `${prompt}. ${stylePrompt}. Portrait 4:5, dark moody background, high contrast, dramatic lighting, no text, no watermarks, no logos.`;

  const res = await fetch("https://api.together.ai/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "black-forest-labs/FLUX.1-schnell-Free",
      prompt: fullPrompt,
      width: 832,
      height: 1040,
      steps: 4,
      n: 1,
      response_format: "b64_json",
    }),
    signal: AbortSignal.timeout(40000),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? `Together HTTP ${res.status}`);

  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("Together: sem imagem na resposta");

  console.log("[image] Together AI OK");
  return { imageUrl: `data:image/jpeg;base64,${b64}`, source: "together" };
}

// ── Pollinations.ai (FLUX — 100% gratuito, sem API key) ────
async function fromPollinations(prompt: string, style: ImageStyle) {
  const stylePrompt = STYLE_PROMPTS[style] ?? STYLE_PROMPTS.cinematico;
  const fullPrompt = `${prompt}. ${stylePrompt}. Portrait orientation, dark moody background, high contrast, dramatic lighting, no text, no watermarks.`;
  const seed = Math.floor(Math.random() * 999999);

  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=864&height=1080&model=flux&nologo=true&seed=${seed}&enhance=true`;

  const res = await fetch(url, { signal: AbortSignal.timeout(40000) });
  if (!res.ok) throw new Error(`Pollinations HTTP ${res.status}`);

  const buffer = await res.arrayBuffer();
  const b64 = Buffer.from(buffer).toString("base64");
  const mimeType = res.headers.get("content-type") || "image/jpeg";

  console.log("[image] Pollinations OK");
  return { imageUrl: `data:${mimeType};base64,${b64}`, source: "pollinations" };
}

// ── Gemini (requer billing no GCP) ────────────────────────
const GEMINI_MODELS = [
  "gemini-2.5-flash-image",
  "gemini-3.1-flash-image-preview",
  "gemini-3-pro-image-preview",
];

async function fromGemini(prompt: string, style: ImageStyle) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY não configurada");

  const stylePrompt = STYLE_PROMPTS[style] ?? STYLE_PROMPTS.cinematico;
  const fullPrompt = `${prompt}. Style: ${stylePrompt}. Portrait orientation 4:5, dark moody background, high contrast, dramatic lighting, cinematic composition, no watermarks, no text overlays, no logos.`;

  let lastErr = "";
  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
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

// ── Stability AI ───────────────────────────────────────────
async function fromStability(prompt: string, style: ImageStyle) {
  const key = process.env.STABILITY_API_KEY;
  if (!key) throw new Error("STABILITY_API_KEY não configurada");

  const stylePrompt = STYLE_PROMPTS[style] ?? STYLE_PROMPTS.cinematico;
  const fullPrompt = `${prompt}. ${stylePrompt}. Portrait orientation, dark moody background, high contrast, dramatic lighting, no text, no watermarks.`;

  const form = new FormData();
  form.append("prompt", fullPrompt);
  form.append("aspect_ratio", "4:5");
  form.append("output_format", "jpeg");

  const res = await fetch("https://api.stability.ai/v2beta/stable-image/generate/core", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    body: form,
    signal: AbortSignal.timeout(35000),
  });

  const data = await res.json();
  if (!res.ok || !data.image) throw new Error(data.message ?? `Stability HTTP ${res.status}`);

  console.log("[image] Stability AI OK");
  return { imageUrl: `data:image/jpeg;base64,${data.image}`, source: "stability" };
}

// ── Pexels (fallback final) ────────────────────────────────
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

// ── Handler principal ──────────────────────────────────────
export async function POST(req: NextRequest) {
  const { prompt, imageStyle = "cinematico", customerId, activationToken } = await req.json();
  if (!prompt) return NextResponse.json({ error: "prompt obrigatório" }, { status: 400 });

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

  if (!isPro) {
    // Plano gratuito → Pexels
    try {
      return NextResponse.json({ ...await fromPexels(prompt), plan: "free" });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Plano Pro → Together AI → Pollinations → Gemini → Pexels
  const errors: string[] = [];

  try {
    return NextResponse.json({ ...await fromTogether(prompt, imageStyle as ImageStyle), plan: "pro" });
  } catch (e: any) {
    errors.push(`Together: ${e.message}`);
    console.error("[image] Together falhou:", e.message);
  }

  try {
    return NextResponse.json({ ...await fromPollinations(prompt, imageStyle as ImageStyle), plan: "pro" });
  } catch (e: any) {
    errors.push(`Pollinations: ${e.message}`);
    console.error("[image] Pollinations falhou:", e.message);
  }

  try {
    return NextResponse.json({ ...await fromGemini(prompt, imageStyle as ImageStyle), plan: "pro" });
  } catch (e: any) {
    errors.push(`Gemini: ${e.message}`);
    console.error("[image] Gemini falhou:", e.message);
  }

  try {
    return NextResponse.json({ ...await fromPexels(prompt), plan: "pro_fallback" });
  } catch (e: any) {
    errors.push(`Pexels: ${e.message}`);
    return NextResponse.json({ error: errors.join(" | ") }, { status: 500 });
  }
}
