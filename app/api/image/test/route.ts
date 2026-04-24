import { NextResponse } from "next/server";

export const maxDuration = 55;

function getKeys() {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(Boolean) as string[];
}

// Gemini models use generateContent + responseModalities IMAGE
const GEMINI_MODELS = [
  "gemini-2.5-flash-image",
  "gemini-2.0-flash-exp-image-generation",
];

// Imagen models use predict endpoint
const IMAGEN_MODELS = [
  "imagen-4.0-generate-001",
  "imagen-4.0-fast-generate-001",
];

async function testGemini(key: string, model: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "A red apple on a white table." }] }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    }),
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false, httpStatus: res.status, error: data.error?.message };
  const hasImage = data.candidates?.[0]?.content?.parts?.some((p: any) => p.inlineData);
  return { ok: true, httpStatus: res.status, hasImage };
}

async function testImagen(key: string, model: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt: "A red apple on a white table." }],
      parameters: { sampleCount: 1, aspectRatio: "1:1" },
    }),
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false, httpStatus: res.status, error: data.error?.message };
  const hasImage = !!data.predictions?.[0]?.bytesBase64Encoded;
  return { ok: true, httpStatus: res.status, hasImage };
}

export async function GET() {
  const keys = getKeys();
  if (!keys.length)
    return NextResponse.json({ error: "Nenhuma GEMINI_API_KEY configurada" }, { status: 500 });

  const results: any[] = [];

  for (let ki = 0; ki < keys.length; ki++) {
    const key = keys[ki];
    const keyLabel = `key${ki + 1} (${key.slice(0, 10)}...)`;

    for (const model of GEMINI_MODELS) {
      try {
        const r = await testGemini(key, model);
        results.push({
          key: keyLabel, model, type: "gemini",
          status: r.ok ? (r.hasImage ? "OK ✅" : "no-image ⚠️") : "FAIL",
          httpStatus: r.httpStatus,
          error: (r as any).error,
        });
      } catch (e: any) {
        results.push({ key: keyLabel, model, type: "gemini", status: "EXCEPTION", error: e.message });
      }
    }

    for (const model of IMAGEN_MODELS) {
      try {
        const r = await testImagen(key, model);
        results.push({
          key: keyLabel, model, type: "imagen",
          status: r.ok ? (r.hasImage ? "OK ✅" : "no-image ⚠️") : "FAIL",
          httpStatus: r.httpStatus,
          error: (r as any).error,
        });
      } catch (e: any) {
        results.push({ key: keyLabel, model, type: "imagen", status: "EXCEPTION", error: e.message });
      }
    }
  }

  const working = results.filter(r => r.status.startsWith("OK"));
  return NextResponse.json({ keys: keys.length, working: working.length, results });
}
