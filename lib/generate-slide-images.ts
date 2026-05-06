import { put } from "@vercel/blob";
import { GeneratedSlide } from "@/types";

const STYLE_SUFFIX =
  "cinematic high-quality image, dramatic lighting, rich colors, sharp focus, ultra-detailed, professional photography, Instagram editorial aesthetic, portrait 4:5 aspect ratio, no text, no watermarks, no logos";

// ── OpenAI gpt-image-1 ────────────────────────────────────────────────────────
async function callOpenAI(prompt: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const fullPrompt = `${prompt}. ${STYLE_SUFFIX}`;

  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: fullPrompt,
        n: 1,
        size: "1024x1536",
        quality: "high",
      }),
      signal: AbortSignal.timeout(120000),
    });

    const data = await res.json();
    if (!res.ok) {
      console.warn(`[slide-img] OpenAI HTTP ${res.status}:`, data.error?.message);
      return null;
    }

    const b64 = data.data?.[0]?.b64_json;
    if (!b64) { console.warn("[slide-img] OpenAI: sem b64_json"); return null; }

    return `data:image/png;base64,${b64}`;
  } catch (e: any) {
    console.warn("[slide-img] OpenAI exception:", e.message);
    return null;
  }
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
 * Cadeia: OpenAI DALL-E 3 → Pexels (foto real)
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
        // 1. OpenAI DALL-E 3
        const openAIData = await callOpenAI(slide.imagePrompt);
        if (openAIData) {
          const url = await uploadToBlob(openAIData, name);
          console.log(`[slide-img] slide ${i + 1} — OpenAI OK`);
          return url;
        }

        // 2. Pexels (foto real como fallback final)
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
