import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 20;

interface ImageResult {
  url: string;
  thumb: string;
  width: number;
  height: number;
  title: string;
  source: string;
}

// Wikimedia Commons — fotos reais de eventos, pessoas públicas, etc.
async function searchWikimediaCommons(query: string, page: number): Promise<ImageResult[]> {
  const offset = (page - 1) * 6;
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "6",
    gsrlimit: "12",
    gsroffset: String(offset),
    prop: "imageinfo",
    iiprop: "url|thumburl|size|mediatype",
    iiurlwidth: "1200",
    format: "json",
    origin: "*",
  });

  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    signal: AbortSignal.timeout(8000),
    headers: { "User-Agent": "XPost/1.0" },
  });
  if (!res.ok) return [];

  const data = await res.json();
  const pages = Object.values(data.query?.pages ?? {}) as any[];

  return pages
    .filter((p: any) => {
      const info = p.imageinfo?.[0];
      return info?.url && !info.url.endsWith(".svg") && !info.url.endsWith(".ogv")
        && !info.url.endsWith(".gif")
        && (info.mediatype === "BITMAP" || !info.mediatype);
    })
    .slice(0, 6)
    .map((p: any) => {
      const info = p.imageinfo[0];
      return {
        url: info.url,
        thumb: info.thumburl ?? info.url,
        width: info.thumbwidth ?? info.width ?? 0,
        height: info.thumbheight ?? info.height ?? 0,
        title: (p.title ?? "").replace("File:", ""),
        source: "Wikimedia Commons",
      };
    });
}

export async function POST(req: NextRequest) {
  const { query, page = 1 } = await req.json();
  if (!query?.trim()) return NextResponse.json({ error: "query obrigatória" }, { status: 400 });

  // 1. Serper (Google Images — melhor resultado)
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
        const images: ImageResult[] = data.images.slice(0, 6).map((img: any) => ({
          url: img.imageUrl,
          thumb: img.thumbnailUrl ?? img.imageUrl,
          width: img.imageWidth ?? 0,
          height: img.imageHeight ?? 0,
          title: img.title ?? "",
          source: img.source ?? "Google",
        })).filter((img: ImageResult) => img.url);
        if (images.length > 0) return NextResponse.json({ images });
      }
    } catch {}
  }

  // 2. Wikimedia Commons (grátis, sem chave, fotos reais de eventos/pessoas)
  try {
    const images = await searchWikimediaCommons(query.trim(), page);
    if (images.length > 0) return NextResponse.json({ images });
  } catch {}

  // 3. Pixabay
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
        const images: ImageResult[] = data.hits.slice(0, 6).map((img: any) => ({
          url: img.largeImageURL ?? img.webformatURL,  // largeImageURL = alta resolução
          thumb: img.webformatURL ?? img.previewURL,  // webformat como thumb (640px)
          width: img.imageWidth ?? img.webformatWidth ?? 0,
          height: img.imageHeight ?? img.webformatHeight ?? 0,
          title: img.tags ?? "",
          source: img.user ?? "Pixabay",
        })).filter((img: ImageResult) => img.url);
        if (images.length > 0) return NextResponse.json({ images });
      }
    } catch {}
  }

  // 4. Unsplash
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!unsplashKey) return NextResponse.json({ error: "Nenhuma fonte de imagem configurada" }, { status: 500 });

  const q = encodeURIComponent(query.trim());
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${q}&orientation=portrait&per_page=6&page=${page}`,
    { headers: { Authorization: `Client-ID ${unsplashKey}` }, signal: AbortSignal.timeout(10000) }
  );
  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.errors?.[0] ?? "Erro na busca" }, { status: 500 });

  const images: ImageResult[] = (data.results ?? []).map((img: any) => ({
    url: img.urls?.regular ?? img.urls?.full,
    thumb: img.urls?.small ?? img.urls?.thumb,
    width: img.width,
    height: img.height,
    title: img.alt_description ?? img.description ?? "",
    source: img.user?.name ?? "Unsplash",
  })).filter((img: ImageResult) => img.url);

  return NextResponse.json({ images });
}
