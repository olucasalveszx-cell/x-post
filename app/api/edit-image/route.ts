import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const maxDuration = 55;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { imageBase64, imageMime = "image/jpeg", prompt } = await req.json();
  if (!imageBase64 || !prompt) {
    return NextResponse.json({ error: "imageBase64 e prompt são obrigatórios" }, { status: 400 });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "GEMINI_API_KEY não configurada" }, { status: 500 });

  const instruction = `You are an expert photo editor.
Take the provided image and apply ONLY the requested change: "${prompt}".
Keep everything else IDENTICAL — the person's face, body, clothing, background style, lighting, and overall composition must remain exactly the same.
Only add or change what was explicitly requested in the prompt.
Output a high-quality edited version of the image in portrait 4:5 ratio.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${key}`,
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
    if (!res.ok) throw new Error(data.error?.message ?? `Gemini HTTP ${res.status}`);

    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const img = parts.find((p: any) => p.inlineData);
    if (!img?.inlineData) throw new Error("Gemini: sem imagem na resposta");

    return NextResponse.json({
      imageUrl: `data:${img.inlineData.mimeType};base64,${img.inlineData.data}`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
