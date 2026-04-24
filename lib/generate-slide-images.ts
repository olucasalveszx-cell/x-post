import { put } from "@vercel/blob";
import { GeneratedSlide } from "@/types";

const STYLE_SUFFIX =
  "cinematic high-quality image, dramatic lighting, rich colors, sharp focus, ultra-detailed, professional photography, Instagram editorial aesthetic, portrait 4:5 aspect ratio, no text, no watermarks, no logos";

function getGeminiKeys(): string[] {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(Boolean) as string[];
}

// ── Gemini Flash (geração nativa de imagem) ───────────────────────────────────
async function callGeminiFlash(prompt: string): Promise<string | null> {
  const keys = getGeminiKeys();
  if (!keys.length) return null;

  const fullPrompt = `${prompt}. ${STYLE_SUFFIX}`;
  const MODELS = ["gemini-2.5-flash-preview-image", "gemini-2.0-flash-exp"];

  for (const key of keys) {
    for (const model of MODELS) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: fullPrompt }] }],
              generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
            }),
            signal: AbortSignal.timeout(20000),
          }
        );

        const data = await res.json();
        if (!res.ok) {
          console.warn(`[slide-img] ${model} HTTP ${res.status}:`, data.error?.message);
          if (res.status === 429) break; // quota — tenta próxima chave
          continue;
        }

        const parts = data.candidates?.[0]?.content?.parts ?? [];
        const imagePart = parts.find((p: any) => p.inlineData);
        if (!imagePart?.inlineData) {
          console.warn(`[slide-img] ${model}: sem inlineData na resposta`);
          continue;
        }

        const { data: b64, mimeType } = imagePart.inlineData;
        return `data:${mimeType};base64,${b64}`;
      } catch (e: any) {
        console.warn(`[slide-img] ${model} exception:`, e.message);
        continue;
      }
    }
  }
  return null;
}

// ── Imagen 4 Fast (fallback rápido) ──────────────────────────────────────────
async function callImagen(prompt: string): Promise<string | null> {
  const keys = getGeminiKeys();
  if (!keys.length) return null;

  const fullPrompt = `${prompt}. ${STYLE_SUFFIX}`;
  const MODELS = [
    "imagen-4.0-fast-generate-001",
    "imagen-4.0-generate-001",
  ];

  for (const key of keys) {
    for (const model of MODELS) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${key}`,
          {
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
            signal: AbortSignal.timeout(30000),
          }
        );

        const data = await res.json();
        if (!res.ok) {
          console.warn(`[slide-img] ${model} HTTP ${res.status}:`, data.error?.message);
          if (res.status === 429) break;
          continue;
        }

        const pred = data.predictions?.[0];
        if (!pred?.bytesBase64Encoded) {
          console.warn(`[slide-img] ${model}: sem bytesBase64Encoded`);
          continue;
        }

        return `data:${pred.mimeType ?? "image/png"};base64,${pred.bytesBase64Encoded}`;
      } catch (e: any) {
        console.warn(`[slide-img] ${model} exception:`, e.message);
        continue;
      }
    }
  }
  return null;
}

// ── Pexels (fallback final com foto real) ─────────────────────────────────────
async function callPexels(query: string): Promise<string | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=portrait`,
      { headers: { Authorization: key }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const photo = data.photos?.[0];
    return photo?.src?.large2x ?? photo?.src?.large ?? null;
  } catch {
    return null;
  }
}

// ── Upload para Vercel Blob ───────────────────────────────────────────────────
async function uploadToBlob(dataUrl: string, name: string): Promise<string> {
  const [header, b64] = dataUrl.split(",");
  const mimeType = header.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";
  const ext = mimeType.split("/")[1]?.split("+")[0] ?? "jpg";
  const buffer = Buffer.from(b64, "base64");

  const blob = await put(`autopost/${name}.${ext}`, buffer, {
    access: "public",
    contentType: mimeType,
  });
  return blob.url;
}

// ── Proxy URL externa para Blob (Pexels não precisa de upload) ────────────────
async function proxyUrlToBlob(url: string, name: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`proxy HTTP ${res.status}`);
  const buffer = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const ext = contentType.split("/")[1]?.split(";")[0] ?? "jpg";
  const blob = await put(`autopost/${name}.${ext}`, Buffer.from(buffer), {
    access: "public",
    contentType,
  });
  return blob.url;
}

/**
 * Gera imagens para cada slide em paralelo.
 * Cadeia: Gemini Flash → Imagen 4 Fast → Pexels (foto real)
 * Sempre retorna uma URL de imagem ou null se todos os fallbacks falharem.
 */
export async function generateSlideImages(
  slides: GeneratedSlide[],
  postId: string
): Promise<(string | null)[]> {
  return Promise.all(
    slides.map(async (slide, i) => {
      const name = `${postId}/slide-${i + 1}`;
      const fallbackQuery = slide.searchQuery?.trim() || slide.title;

      try {
        // 1. Gemini Flash
        const geminiData = await callGeminiFlash(slide.imagePrompt);
        if (geminiData) {
          const url = await uploadToBlob(geminiData, name);
          console.log(`[slide-img] slide ${i + 1} — Gemini OK`);
          return url;
        }

        // 2. Imagen 4
        const imagenData = await callImagen(slide.imagePrompt);
        if (imagenData) {
          const url = await uploadToBlob(imagenData, name);
          console.log(`[slide-img] slide ${i + 1} — Imagen OK`);
          return url;
        }

        // 3. Pexels (foto real como fallback final)
        const pexelsUrl = await callPexels(fallbackQuery);
        if (pexelsUrl) {
          const url = await proxyUrlToBlob(pexelsUrl, name);
          console.log(`[slide-img] slide ${i + 1} — Pexels fallback OK`);
          return url;
        }

        console.error(`[slide-img] slide ${i + 1} — todos os fallbacks falharam`);
        return null;
      } catch (e: any) {
        console.error(`[slide-img] slide ${i + 1} exception:`, e.message);
        return null;
      }
    })
  );
}
