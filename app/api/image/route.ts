import { NextRequest, NextResponse } from "next/server";

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

async function fromGemini(prompt: string, style: ImageStyle) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY não configurada");

  const stylePrompt = STYLE_PROMPTS[style] ?? STYLE_PROMPTS.cinematico;
  const fullPrompt = `${prompt}. Style: ${stylePrompt}. Dark moody background, portrait orientation, high contrast, no watermarks, no text overlays.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${key}`;
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
  if (!res.ok) throw new Error(`Gemini: ${data.error?.message ?? JSON.stringify(data).slice(0, 120)}`);

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p: any) => p.inlineData);
  if (!imagePart?.inlineData) throw new Error("Gemini: sem imagem na resposta");

  const { data: b64, mimeType } = imagePart.inlineData;
  return { imageUrl: `data:${mimeType};base64,${b64}`, source: "gemini" };
}

export async function POST(req: NextRequest) {
  const { prompt, imageStyle = "cinematico" } = await req.json();

  if (!prompt) return NextResponse.json({ error: "prompt obrigatório" }, { status: 400 });

  try {
    const result = await fromGemini(prompt, imageStyle as ImageStyle);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[image] Gemini falhou:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
