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

async function searchGoogle(query: string, page: number): Promise<ImageResult[]> {
  const serperKey = process.env.SERPER_API_KEY;
  if (!serperKey) return [];
  const res = await fetch("https://google.serper.dev/images", {
    method: "POST",
    headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, num: 30, page, gl: "br", hl: "pt" }),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  if (!data.images?.length) return [];
  const DIRECT_IMAGE = /\.(jpe?g|png|webp|avif)(\?|$)/i;
  const BLOCKED_HOSTS = /instagram\.com|facebook\.com|pinterest\.com|tiktok\.com|twitter\.com|x\.com/i;

  return (data.images as any[])
    .filter((img: any) => img.thumbnailUrl)
    .map((img: any) => {
      const rawUrl: string = img.imageUrl ?? "";
      const useDirectUrl = rawUrl &&
        !BLOCKED_HOSTS.test(rawUrl) &&
        (DIRECT_IMAGE.test(rawUrl) || (!rawUrl.includes("crawler") && !rawUrl.includes("widget")));
      const w = img.imageWidth ?? 0;
      const h = img.imageHeight ?? 0;
      return {
        url: useDirectUrl ? rawUrl : img.thumbnailUrl,
        thumb: img.thumbnailUrl,
        width: w,
        height: h,
        title: img.title ?? "",
        source: img.source ?? (rawUrl ? (() => { try { return new URL(rawUrl).hostname; } catch { return "Web"; } })() : "Web"),
        // score: prioriza imagens de alta resolução
        _score: (useDirectUrl ? 2 : 0) + (w >= 1920 ? 3 : w >= 1000 ? 2 : w >= 600 ? 1 : 0),
      };
    })
    .filter((img) => img.url)
    .sort((a, b) => b._score - a._score)
    .slice(0, 20)
    .map(({ _score, ...img }) => img);
}

// Wikimedia Commons — fallback gratuito com fotos reais de eventos/pessoas públicas
async function searchWikimedia(query: string, page: number): Promise<ImageResult[]> {
  const offset = (page - 1) * 8;
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "6",
    gsrlimit: "16",
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
      return info?.url && !info.url.endsWith(".svg") && !info.url.endsWith(".ogv") && !info.url.endsWith(".gif") && (info.mediatype === "BITMAP" || !info.mediatype);
    })
    .slice(0, 8)
    .map((p: any) => {
      const info = p.imageinfo[0];
      return {
        url: info.thumburl ?? info.url,
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

  // 1. Google Images via Serper — fonte principal
  const googleImages = await searchGoogle(query.trim(), page);
  if (googleImages.length > 0) return NextResponse.json({ images: googleImages });

  // 2. Wikimedia Commons — fallback sem chave
  const wikiImages = await searchWikimedia(query.trim(), page);
  if (wikiImages.length > 0) return NextResponse.json({ images: wikiImages });

  return NextResponse.json({ error: "Nenhuma imagem encontrada. Tente outro termo." }, { status: 404 });
}
