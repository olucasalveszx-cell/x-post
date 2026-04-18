import { NextResponse } from "next/server";

export const maxDuration = 30;

export async function GET() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "GEMINI_API_KEY não configurada" }, { status: 500 });

  // Testa cada modelo individualmente com prompt simples
  const MODELS = [
    "gemini-2.0-flash-preview-image-generation",
    "gemini-2.0-flash-exp-image-generation",
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-2.5-flash-preview-04-17",
  ];

  const results: Record<string, string> = {};

  for (const model of MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Generate a simple red circle image" }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
        signal: AbortSignal.timeout(8000),
      });
      const data = await res.json();
      if (!res.ok) {
        results[model] = `HTTP ${res.status}: ${data.error?.message ?? "erro desconhecido"}`;
        continue;
      }
      const parts = data.candidates?.[0]?.content?.parts ?? [];
      const hasImage = parts.some((p: any) => p.inlineData);
      results[model] = hasImage ? "✅ OK — gerou imagem" : `⚠️ sem imagem na resposta (${parts.length} parts)`;
    } catch (e: any) {
      results[model] = `❌ ${e.message}`;
    }
  }

  // Testa também Imagen 3
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${key}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt: "a red circle" }],
        parameters: { sampleCount: 1, aspectRatio: "3:4" },
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    results["imagen-3.0-generate-002"] = res.ok ? "✅ OK" : `HTTP ${res.status}: ${data.error?.message}`;
  } catch (e: any) {
    results["imagen-3.0-generate-002"] = `❌ ${e.message}`;
  }

  return NextResponse.json({ results, keyPrefix: key.slice(0, 8) + "..." });
}
