import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 20;

export async function POST(req: NextRequest) {
  const { query, page = 1 } = await req.json();
  if (!query?.trim()) return NextResponse.json({ error: "query obrigatória" }, { status: 400 });

  const serperKey = process.env.SERPER_API_KEY;

  if (serperKey) {
    try {
      const res = await fetch("https://google.serper.dev/images", {
        method: "POST",
        headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
        body: JSON.stringify({ q: query.trim(), num: 12, page }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json();
      if (res.ok && data.images?.length) {
        const images = data.images.slice(0, 6).map((img: any) => ({
          url: img.imageUrl,
          thumb: img.thumbnailUrl ?? img.imageUrl,
          width: img.imageWidth ?? 0,
          height: img.imageHeight ?? 0,
          title: img.title ?? "",
          source: img.source ?? "Google",
        })).filter((img: any) => img.url);
        if (images.length > 0) return NextResponse.json({ images });
      }
    } catch {}
  }

  // Fallback 1: Pixabay (ampla cobertura de conteúdo real)
  const pixabayKey = process.env.PIXABAY_API_KEY;
  if (pixabayKey) {
    try {
      const q = encodeURIComponent(query.trim());
      const res = await fetch(
        `https://pixabay.com/api/?key=${pixabayKey}&q=${q}&image_type=photo&orientation=vertical&per_page=9&page=${page}&safesearch=true`,
        { signal: AbortSignal.timeout(10000) }
      );
      const data = await res.json();
      if (res.ok && data.hits?.length) {
        const images = data.hits.slice(0, 6).map((img: any) => ({
          url: img.webformatURL,
          thumb: img.previewURL,
          width: img.webformatWidth ?? 0,
          height: img.webformatHeight ?? 0,
          title: img.tags ?? "",
          source: img.user ?? "Pixabay",
        })).filter((img: any) => img.url);
        if (images.length > 0) return NextResponse.json({ images });
      }
    } catch {}
  }

  // Fallback 2: Unsplash
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!unsplashKey) return NextResponse.json({ error: "Nenhuma chave de busca configurada" }, { status: 500 });

  const q = encodeURIComponent(query.trim());
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${q}&orientation=portrait&per_page=6&page=${page}`,
    { headers: { Authorization: `Client-ID ${unsplashKey}` }, signal: AbortSignal.timeout(10000) }
  );
  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.errors?.[0] ?? "Erro na busca" }, { status: 500 });

  const images = (data.results ?? []).map((img: any) => ({
    url: img.urls?.regular ?? img.urls?.full,
    thumb: img.urls?.small ?? img.urls?.thumb,
    width: img.width,
    height: img.height,
    title: img.alt_description ?? img.description ?? "",
    source: img.user?.name ?? "Unsplash",
  })).filter((img: any) => img.url);

  return NextResponse.json({ images });
}
