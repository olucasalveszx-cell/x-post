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

// v5 = Blob URLs (não mais base64 no Redis)
const CACHE_PREFIX = "landing:img:v5:";

async function generateWithGemini(prompt: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const fullPrompt = `${prompt}. Cinematic ultra-high-quality Instagram editorial image, dramatic lighting, rich saturated colors, professional photography style, portrait 4:5 aspect ratio, no text overlay, no watermarks, no logos.`;

  const MODELS = [
    "gemini-2.5-flash-image",
    "gemini-3.1-flash-image-preview",
    "gemini-3-pro-image-preview",
  ];

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
        console.error(`[landing-img] ${model} falhou:`, err.error?.message);
        continue;
      }

      const data = await res.json();
      const parts = data.candidates?.[0]?.content?.parts ?? [];
      const imgPart = parts.find((p: any) => p.inlineData);
      if (!imgPart?.inlineData) continue;

      const { data: b64, mimeType } = imgPart.inlineData;
      console.log(`[landing-img] Gemini OK (${model})`);
      return `data:${mimeType};base64,${b64}`;
    } catch (e: any) {
      console.error(`[landing-img] ${model} erro:`, e.message);
    }
  }
  return null;
}

const HEADERS = { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" };

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!TOPICS[id]) {
    return NextResponse.json({ error: "Tópico não encontrado" }, { status: 404 });
  }

  // 1. Redis cache (mais rápido)
  try {
    const cached = await redisGet(`${CACHE_PREFIX}${id}`);
    if (cached) return NextResponse.json({ url: cached }, { headers: HEADERS });
  } catch {}

  // 2. Vercel Blob — busca imagem já existente mesmo sem Redis
  // Garante que se o Redis for limpo a imagem não precisa ser regerada
  try {
    const { blobs } = await list({ prefix: `landing/${id}` });
    if (blobs.length > 0) {
      const url = blobs[0].url;
      redisSet(`${CACHE_PREFIX}${id}`, url).catch(() => {}); // repopula Redis
      return NextResponse.json({ url }, { headers: HEADERS });
    }
  } catch {}

  // 3. Gera nova imagem com Gemini (só quando não existe nenhuma cópia)
  const dataUrl = await generateWithGemini(TOPICS[id]);
  if (!dataUrl) return NextResponse.json({ error: "Falha na geração" }, { status: 500 });

  // 4. Upload permanente para Vercel Blob
  try {
    const [header, b64] = dataUrl.split(",");
    const mimeType = header.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";
    const ext = mimeType.split("/")[1]?.split("+")[0] ?? "jpg";
    const buffer = Buffer.from(b64, "base64");
    const blob = await put(`landing/${id}.${ext}`, buffer, {
      access: "public",
      contentType: mimeType,
      allowedOrigins: ["*"],
    });
    redisSet(`${CACHE_PREFIX}${id}`, blob.url).catch(() => {});
    return NextResponse.json({ url: blob.url }, { headers: HEADERS });
  } catch (e: any) {
    console.error("[landing-img] Blob upload falhou:", e.message);
    return NextResponse.json({ url: dataUrl });
  }
}
