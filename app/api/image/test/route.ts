import { NextResponse } from "next/server";

export const maxDuration = 55;

function getKeys() {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(Boolean) as string[];
}

const MODELS = [
  "gemini-2.5-flash-preview-05-20",
  "gemini-2.5-flash-image",
  "gemini-2.0-flash-preview-image-generation",
  "gemini-2.0-flash-exp-image-generation",
];

export async function GET() {
  const keys = getKeys();
  if (!keys.length) return NextResponse.json({ error: "Nenhuma GEMINI_API_KEY configurada" }, { status: 500 });

  const results: any[] = [];

  for (let ki = 0; ki < keys.length; ki++) {
    const key = keys[ki];
    const keyLabel = `key${ki + 1} (${key.slice(0, 10)}...)`;

    for (const model of MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "A red apple on a white table. Simple photo." }] }],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
          }),
          signal: AbortSignal.timeout(20000),
        });

        const data = await res.json();
        if (!res.ok) {
          results.push({ key: keyLabel, model, status: "FAIL", httpStatus: res.status, error: data.error?.message });
          continue;
        }

        const parts = data.candidates?.[0]?.content?.parts ?? [];
        const hasImage = parts.some((p: any) => p.inlineData);
        results.push({ key: keyLabel, model, status: hasImage ? "OK ✅" : "no-image ⚠️", httpStatus: res.status });

        if (hasImage) break; // não precisa testar mais modelos para essa chave

      } catch (e: any) {
        results.push({ key: keyLabel, model, status: "EXCEPTION", error: e.message });
      }
    }
  }

  return NextResponse.json({ keys: keys.length, results });
}
