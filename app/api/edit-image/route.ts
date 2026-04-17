import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 55;

const EDIT_MODELS = [
  "gemini-2.0-flash-preview-image-generation",
  "gemini-2.0-flash-exp-image-generation",
];

export async function POST(req: NextRequest) {
  const { imageBase64, imageMime = "image/jpeg", prompt } = await req.json();
  if (!imageBase64 || !prompt) {
    return NextResponse.json({ error: "imageBase64 e prompt são obrigatórios" }, { status: 400 });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "GEMINI_API_KEY não configurada" }, { status: 500 });

  const instruction = `You are an expert photo editor. Apply ONLY this change to the image: "${prompt}". Keep everything else identical — composition, lighting, style, faces, and background. Output a high-quality edited image.`;

  let lastError = "";

  for (const model of EDIT_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inlineData: { mimeType: imageMime, data: imageBase64 } },
                { text: instruction },
              ],
            }],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
          }),
          signal: AbortSignal.timeout(50000),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        lastError = data.error?.message ?? `${model} HTTP ${res.status}`;
        console.error(`[edit-image] ${model} falhou:`, lastError);
        continue;
      }

      const parts = data.candidates?.[0]?.content?.parts ?? [];
      const img = parts.find((p: any) => p.inlineData);
      if (!img?.inlineData) {
        lastError = `${model}: sem imagem na resposta`;
        console.warn(`[edit-image] ${model}:`, lastError);
        continue;
      }

      console.log(`[edit-image] OK via ${model}`);
      return NextResponse.json({
        imageUrl: `data:${img.inlineData.mimeType};base64,${img.inlineData.data}`,
      });
    } catch (e: any) {
      lastError = e.message;
      console.error(`[edit-image] ${model} exception:`, lastError);
    }
  }

  return NextResponse.json({ error: lastError || "Falha em todos os modelos de edição" }, { status: 500 });
}
