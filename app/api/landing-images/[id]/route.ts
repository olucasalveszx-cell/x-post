import { NextRequest, NextResponse } from "next/server";
import { redisGet, redisSet } from "@/lib/redis";
import { put, list } from "@vercel/blob";

export const maxDuration = 60;

const TOPICS: Record<string, string> = {
  nutricao:        "Colorful healthy meal prep bowls with açaí, tropical fruits, green salads and smoothies beautifully arranged, vibrant Brazilian food photography, white marble background",
  fitness:         "Brazilian athlete doing intense CrossFit workout in modern gym, dramatic rim lighting, determination in eyes, sweat and muscle definition, sports photography",
  tecnologia:      "Futuristic AI artificial intelligence holographic interface floating in dark space, glowing blue circuits and data streams, cyberpunk aesthetic",
  produtividade:   "Minimalist home office setup at golden hour, MacBook, coffee, plant, clean desk, productive entrepreneur lifestyle, warm ambient photography",
  viagem:          "Aerial view of stunning Brazilian beach with crystal turquoise water and white sand, Maldives-like paradise, drone photography, wanderlust",
  psicologia:      "Peaceful mindfulness meditation scene, person sitting by serene lake at sunset, mental health wellness, soft golden light, calm and healing atmosphere",
  futebol:         "Brazilian soccer player doing bicycle kick in packed stadium, crowd in green-yellow colors, dramatic motion blur, golden hour stadium lights",
  marketing:       "Young Brazilian content creator recording Instagram Reel with ring light and smartphone, stylish room setup, influencer aesthetic, warm lighting",
  ciencia:         "Futuristic science laboratory with glowing DNA helixes and neon experiment equipment, researcher in white coat, breakthrough discovery atmosphere",
  negocios:        "Confident Brazilian entrepreneur in modern glass office skyscraper with city view, business meeting with diverse team, success and growth",
  sustentabilidade:"Beautiful solar panel field at golden sunset with wind turbines, green renewable energy landscape, eco-future Brazil, inspirational environmental photography",
  musica:          "Sertanejo or funk singer performing on massive arena stage with dramatic LED lighting, pyrotechnics, energetic crowd of thousands, concert photography",
  moda:            "High fashion editorial photography in São Paulo streets, model in luxury Brazilian designer outfit, confident pose, urban chic aesthetic, Vogue style",
  saude:           "Modern Brazilian hospital with advanced medical technology, friendly doctor with patient, health innovation, clean clinical environment, trust and care",
  politica:        "Brazilian political rally with crowd holding flags, powerful speaker at podium under stadium lights, civic energy, democratic participation",
  fofoca:          "Celebrity gossip glamour scene, famous Brazilian stars on red carpet with paparazzi flashes, luxury fashion, entertainment industry, spotlight moment",
  cripto:          "Bitcoin and crypto trading on multiple screens with rising charts, digital financial data visualization, dark trading room with neon glow, investment success",
  advocacia:       "Professional Brazilian law office, serious lawyer in suit surrounded by legal books with scales of justice, courthouse architecture, authority and trust",
  gastronomia:     "Gourmet Brazilian cuisine plating, churrasco and fine dining dishes beautifully presented, Michelin-star restaurant kitchen, culinary arts photography",
  educacao:        "University campus with students studying outdoors, books and laptops, knowledge and learning atmosphere, bright academic future, campus life photography",
};

// Query Unsplash por tópico (inglês, termos simples que geram bons resultados)
const UNSPLASH_QUERY: Record<string, string> = {
  nutricao:        "healthy food nutrition",
  fitness:         "workout gym fitness",
  tecnologia:      "technology artificial intelligence",
  produtividade:   "home office productivity",
  viagem:          "travel beach paradise",
  psicologia:      "meditation mindfulness",
  futebol:         "soccer football sport",
  marketing:       "social media content creator",
  ciencia:         "science laboratory research",
  negocios:        "business entrepreneur office",
  sustentabilidade:"solar energy sustainability",
  musica:          "music concert stage",
  moda:            "fashion style editorial",
  saude:           "healthcare medical doctor",
  politica:        "politics democracy crowd",
  fofoca:          "celebrity red carpet glamour",
  cripto:          "cryptocurrency bitcoin finance",
  advocacia:       "law justice lawyer",
  gastronomia:     "gourmet food restaurant",
  educacao:        "education university students",
};

const CACHE_PREFIX = "landing:img:v5:";

function getGeminiKeys(): string[] {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(Boolean) as string[];
}

async function generateWithGemini(prompt: string): Promise<string | null> {
  const keys = getGeminiKeys();
  if (!keys.length) return null;

  const fullPrompt = `${prompt}. Cinematic ultra-high-quality Instagram editorial image, dramatic lighting, rich saturated colors, professional photography style, portrait 4:5 aspect ratio, no text overlay, no watermarks, no logos.`;

  const MODELS = [
    "gemini-3-pro-image-preview",
    "gemini-2.0-flash-preview-image-generation",
    "gemini-2.0-flash-exp-image-generation",
  ];

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
          signal: AbortSignal.timeout(45000),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error(`[landing-img] ${model} (key${keys.indexOf(key)+1}) falhou:`, err.error?.message);
        continue;
      }

      const data = await res.json();
      const parts = data.candidates?.[0]?.content?.parts ?? [];
      const imgPart = parts.find((p: any) => p.inlineData);
      if (!imgPart?.inlineData) continue;

      const { data: b64, mimeType } = imgPart.inlineData;
      console.log(`[landing-img] Gemini OK (${model}, key${keys.indexOf(key)+1})`);
      return `data:${mimeType};base64,${b64}`;
    } catch (e: any) {
      console.error(`[landing-img] ${model} erro:`, e.message);
    }
  }
  } // end keys loop
  return null;
}

async function fetchFromUnsplash(id: string): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  const query = UNSPLASH_QUERY[id] ?? "photography";
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=portrait&per_page=10`,
      { headers: { Authorization: `Client-ID ${key}` }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const results = data.results ?? [];
    if (!results.length) return null;
    const photo = results[Math.floor(Math.random() * Math.min(results.length, 5))];
    const url = photo.urls?.regular ?? photo.urls?.full;
    console.log(`[landing-img] Unsplash fallback OK (${id})`);
    return url ?? null;
  } catch { return null; }
}

async function fetchFromPexels(id: string): Promise<string | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  const query = UNSPLASH_QUERY[id] ?? "photography";
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=portrait&per_page=10`,
      { headers: { Authorization: key }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const photos = data.photos ?? [];
    if (!photos.length) return null;
    const photo = photos[Math.floor(Math.random() * Math.min(photos.length, 5))];
    const url = photo.src?.large2x ?? photo.src?.original;
    console.log(`[landing-img] Pexels fallback OK (${id})`);
    return url ?? null;
  } catch { return null; }
}

async function saveToBlobAndCache(id: string, dataUrl: string): Promise<string> {
  const [header, b64] = dataUrl.split(",");
  const mimeType = header.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";
  const ext = mimeType.split("/")[1]?.split("+")[0] ?? "jpg";
  const buffer = Buffer.from(b64, "base64");
  const blob = await put(`landing/${id}.${ext}`, buffer, { access: "public", contentType: mimeType });
  redisSet(`${CACHE_PREFIX}${id}`, blob.url).catch(() => {});
  return blob.url;
}

const HEADERS = { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" };

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!TOPICS[id]) {
    return NextResponse.json({ error: "Tópico não encontrado" }, { status: 404 });
  }

  // 1. Redis cache
  try {
    const cached = await redisGet(`${CACHE_PREFIX}${id}`);
    if (cached) return NextResponse.json({ url: cached }, { headers: HEADERS });
  } catch {}

  // 2. Vercel Blob (persistência mesmo sem Redis)
  try {
    const { blobs } = await list({ prefix: `landing/${id}` });
    if (blobs.length > 0) {
      const url = blobs[0].url;
      redisSet(`${CACHE_PREFIX}${id}`, url).catch(() => {});
      return NextResponse.json({ url }, { headers: HEADERS });
    }
  } catch {}

  // 3. Gera com Gemini
  const geminiDataUrl = await generateWithGemini(TOPICS[id]);
  if (geminiDataUrl) {
    try {
      const url = await saveToBlobAndCache(id, geminiDataUrl);
      return NextResponse.json({ url }, { headers: HEADERS });
    } catch {
      return NextResponse.json({ url: geminiDataUrl }, { headers: HEADERS });
    }
  }

  // 4. Fallback Unsplash (URL externa — não salva no Blob, mas funciona)
  const unsplashUrl = await fetchFromUnsplash(id);
  if (unsplashUrl) {
    redisSet(`${CACHE_PREFIX}${id}`, unsplashUrl).catch(() => {});
    return NextResponse.json({ url: unsplashUrl }, { headers: HEADERS });
  }

  // 5. Fallback Pexels
  const pexelsUrl = await fetchFromPexels(id);
  if (pexelsUrl) {
    redisSet(`${CACHE_PREFIX}${id}`, pexelsUrl).catch(() => {});
    return NextResponse.json({ url: pexelsUrl }, { headers: HEADERS });
  }

  return NextResponse.json({ error: "Falha na geração" }, { status: 500 });
}
