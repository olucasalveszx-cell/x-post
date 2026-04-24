import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const maxDuration = 60;

const GEMINI_MODELS = [
  "gemini-2.5-flash-image",
  "gemini-2.0-flash-exp",
];

async function editWithGemini(imageBase64: string, imageMime: string, prompt: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY não configurada");

  const instruction = `You are an expert photo editor. Apply ONLY this change to the image: "${prompt}". Keep everything else identical — composition, lighting, style, faces, and background. Output a high-quality edited image.`;

  for (const model of GEMINI_MODELS) {
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
        console.error(`[edit-image] ${model} falhou:`, data.error?.message);
        continue;
      }

      const parts = data.candidates?.[0]?.content?.parts ?? [];
      const img = parts.find((p: any) => p.inlineData);
      if (!img?.inlineData) { console.warn(`[edit-image] ${model}: sem imagem`); continue; }

      console.log(`[edit-image] Gemini OK (${model})`);
      return `data:${img.inlineData.mimeType};base64,${img.inlineData.data}`;
    } catch (e: any) {
      console.error(`[edit-image] ${model} exception:`, e.message);
    }
  }
  throw new Error("Gemini: falha em todos os modelos");
}

async function editWithFluxKontext(imageBase64: string, imageMime: string, prompt: string) {
  const falKey = process.env.FAL_KEY;
  if (!falKey) throw new Error("FAL_KEY não configurada");

  // Upload imagem para Blob para obter URL pública
  const ext = imageMime.split("/")[1]?.split("+")[0] ?? "jpg";
  const buffer = Buffer.from(imageBase64, "base64");
  const blob = await put(`edit-tmp/${Date.now()}.${ext}`, buffer, {
    access: "public",
    contentType: imageMime,
  });

  const instruction = `${prompt}. Keep composition, faces, and background intact. Apply only the requested change.`;

  const res = await fetch("https://fal.run/fal-ai/flux-kontext/v2", {
    method: "POST",
    headers: {
      "Authorization": `Key ${falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image_url: blob.url,
      prompt: instruction,
      num_images: 1,
      output_format: "jpeg",
    }),
    signal: AbortSignal.timeout(55000),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? data.error ?? `fal.ai HTTP ${res.status}`);

  const outputUrl: string = data.images?.[0]?.url;
  if (!outputUrl) throw new Error("flux-kontext: sem imagem na resposta");

  console.log("[edit-image] flux-kontext OK");

  // Converte URL de resultado em base64 para retornar ao cliente
  const imgRes = await fetch(outputUrl);
  const imgBuf = await imgRes.arrayBuffer();
  const b64 = Buffer.from(imgBuf).toString("base64");
  const mime = imgRes.headers.get("content-type") ?? "image/jpeg";
  return `data:${mime};base64,${b64}`;
}

export async function POST(req: NextRequest) {
  const { imageBase64, imageMime = "image/jpeg", prompt } = await req.json();
  if (!imageBase64 || !prompt) {
    return NextResponse.json({ error: "imageBase64 e prompt são obrigatórios" }, { status: 400 });
  }

  // Tenta Gemini primeiro
  try {
    const imageUrl = await editWithGemini(imageBase64, imageMime, prompt);
    return NextResponse.json({ imageUrl, source: "gemini" });
  } catch (e: any) {
    console.error("[edit-image] Gemini falhou, tentando flux-kontext:", e.message);
  }

  // Fallback: fal.ai flux-kontext
  try {
    const imageUrl = await editWithFluxKontext(imageBase64, imageMime, prompt);
    return NextResponse.json({ imageUrl, source: "flux-kontext" });
  } catch (e: any) {
    console.error("[edit-image] flux-kontext falhou:", e.message);
    return NextResponse.json({ error: e.message || "Falha em todos os modelos de edição" }, { status: 500 });
  }
}
