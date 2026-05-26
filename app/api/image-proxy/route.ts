import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 15;

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://www.google.com/",
  "Sec-Fetch-Dest": "image",
  "Sec-Fetch-Mode": "no-cors",
  "Sec-Fetch-Site": "cross-site",
};

async function tryFetch(url: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: BROWSER_HEADERS,
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.startsWith("image/")) return null;
    const buffer = await res.arrayBuffer();
    // Reject thumbnails — full-size images are typically >30KB; thumbnails <10KB
    if (buffer.byteLength < 30000) return null;
    return { base64: Buffer.from(buffer).toString("base64"), mimeType: ct.split(";")[0] };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { url, thumbUrl } = await req.json();
  if (!url?.startsWith("http")) return NextResponse.json({ error: "URL inválida" }, { status: 400 });

  // Try main URL first, then thumbnail as fallback
  const result = (await tryFetch(url)) ?? (thumbUrl ? await tryFetch(thumbUrl) : null);

  if (!result) {
    return NextResponse.json({ error: "Não foi possível carregar a imagem. Tente outra." }, { status: 400 });
  }

  return NextResponse.json(result);
}
