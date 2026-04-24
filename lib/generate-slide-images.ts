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

// Chama Gemini e devolve data URL base64 ou null
async function callGemini(prompt: string): Promise<string | null> {
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
            signal: AbortSignal.timeout(22000),
          }
        );

        const data = await res.json();
        if (!res.ok) {
          // Quota esgotada nessa chave — tenta a próxima
          if (res.status === 429) break;
          continue;
        }

        const parts = data.candidates?.[0]?.content?.parts ?? [];
        const imagePart = parts.find((p: any) => p.inlineData);
        if (!imagePart?.inlineData) continue;

        const { data: b64, mimeType } = imagePart.inlineData;
        return `data:${mimeType};base64,${b64}`;
      } catch {
        continue;
      }
    }
  }
  return null;
}

// Converte data URL para Vercel Blob e devolve URL pública
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

/**
 * Gera imagens com Gemini para cada slide em paralelo.
 * Retorna array de URLs públicas (Vercel Blob).
 * Slides sem imagem gerada retornam null na posição correspondente.
 */
export async function generateSlideImages(
  slides: GeneratedSlide[],
  postId: string
): Promise<(string | null)[]> {
  return Promise.all(
    slides.map(async (slide, i) => {
      try {
        const dataUrl = await callGemini(slide.imagePrompt);
        if (!dataUrl) return null;
        const blobUrl = await uploadToBlob(dataUrl, `${postId}/slide-${i + 1}`);
        console.log(`[generate-slide-images] slide ${i + 1} OK: ${blobUrl.slice(0, 60)}`);
        return blobUrl;
      } catch (e: any) {
        console.error(`[generate-slide-images] slide ${i + 1} falhou:`, e.message);
        return null;
      }
    })
  );
}
