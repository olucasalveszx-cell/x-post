import { NextRequest, NextResponse } from "next/server";

function buildAiPrompt(prompt: string): string {
  return `${prompt}, dramatic cinematic lighting, dark moody atmosphere, editorial photography style, high detail, 4k, no text overlays`;
}

async function searchPexels(query: string, page: number): Promise<any[]> {
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=portrait&per_page=15&page=${page}`,
    { headers: { Authorization: process.env.PEXELS_API_KEY! } }
  );
  if (!res.ok) throw new Error(`Pexels HTTP ${res.status}`);
  const data = await res.json();
  return data.photos ?? [];
}

async function fromPexels(prompt: string) {
  if (!process.env.PEXELS_API_KEY) throw new Error("PEXELS_API_KEY não configurada");

  // Extract a clean short query (keep accented chars for Pexels — it handles them)
  const query = prompt
    .split(/[,.|]/)[0]
    .replace(/<[^>]+>/g, "")     // strip HTML
    .replace(/[^\w\sÀ-ÿ]/g, "") // keep letters (including accented) and spaces
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .join(" ");

  const finalQuery = query.length >= 3 ? query : "technology business";

  // Try a random page 1-3, fallback to page 1 if empty
  const page = Math.ceil(Math.random() * 3);
  let photos = await searchPexels(finalQuery, page);
  if (!photos.length && page !== 1) {
    photos = await searchPexels(finalQuery, 1);
  }
  // Last resort: broad fallback query
  if (!photos.length) {
    photos = await searchPexels("business technology", 1);
  }
  if (!photos.length) throw new Error(`Pexels: sem resultados para "${finalQuery}"`);

  const photo = photos[Math.floor(Math.random() * photos.length)];
  const url = photo.src?.large2x ?? photo.src?.original;
  if (!url) throw new Error("Pexels: URL não encontrada");
  console.log(`[image] Pexels OK: "${finalQuery}" (pág ${page})`);
  return { imageUrl: url, source: "pexels" };
}

async function fromImagen3(prompt: string) {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${process.env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt: buildAiPrompt(prompt) }],
      parameters: { sampleCount: 1, aspectRatio: "3:4", personGeneration: "allow_adult", safetyFilterLevel: "block_some" },
    }),
    signal: AbortSignal.timeout(30000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Imagen 3: ${data.error?.message ?? JSON.stringify(data).slice(0, 100)}`);
  const prediction = data.predictions?.[0];
  if (!prediction?.bytesBase64Encoded) throw new Error("Imagen 3: sem imagem na resposta");
  console.log("[image] Imagen 3 OK ✓");
  return { imageUrl: `data:${prediction.mimeType ?? "image/png"};base64,${prediction.bytesBase64Encoded}`, source: "imagen3" };
}

async function fromGeminiFlash(prompt: string) {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildAiPrompt(prompt) }] }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    }),
    signal: AbortSignal.timeout(25000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini Flash: ${data.error?.message ?? JSON.stringify(data).slice(0, 100)}`);
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p: any) => p.inlineData);
  if (!imagePart?.inlineData) throw new Error("Gemini Flash: sem imagem na resposta");
  const { data: b64, mimeType } = imagePart.inlineData;
  console.log("[image] Gemini Flash OK ✓");
  return { imageUrl: `data:${mimeType};base64,${b64}`, source: "gemini-flash" };
}

async function fromDallE(prompt: string) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY não configurada");
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: buildAiPrompt(prompt),
      n: 1,
      size: "1024x1792", // retrato, mais próximo de 4:5
      quality: "standard",
      response_format: "url",
    }),
    signal: AbortSignal.timeout(30000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`DALL-E 3: ${data.error?.message ?? JSON.stringify(data).slice(0, 100)}`);
  const url = data.data?.[0]?.url;
  if (!url) throw new Error("DALL-E 3: sem URL na resposta");
  console.log("[image] DALL-E 3 OK ✓");
  return { imageUrl: url, source: "dalle3" };
}

export async function POST(req: NextRequest) {
  const { prompt, source = "pexels" } = await req.json();

  try {
    if (source === "imagen3")     return NextResponse.json(await fromImagen3(prompt));
    if (source === "gemini")      return NextResponse.json(await fromGeminiFlash(prompt));
    if (source === "dalle3")      return NextResponse.json(await fromDallE(prompt));
    return NextResponse.json(await fromPexels(prompt)); // "pexels" (padrão)
  } catch (err: any) {
    console.error(`[image] ${source} falhou:`, err.message);
    // Fallback automático para Pexels se IA falhar
    if (source !== "pexels" && process.env.PEXELS_API_KEY) {
      try {
        console.log("[image] Fallback → Pexels");
        return NextResponse.json(await fromPexels(prompt));
      } catch (fb: any) {
        console.error("[image] Pexels fallback falhou:", fb.message);
      }
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
