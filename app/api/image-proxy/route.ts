import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 20;

const HEADERS_LIST: Record<string, string>[] = [
  // Tentativa 1: Chrome desktop com Referer do Google
  {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.google.com/",
    "Sec-Fetch-Dest": "image",
    "Sec-Fetch-Mode": "no-cors",
    "Sec-Fetch-Site": "cross-site",
  },
  // Tentativa 2: sem Sec-Fetch headers (alguns sites bloqueiam esses)
  {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    "Accept": "image/*,*/*;q=0.8",
    "Referer": "https://www.google.com/",
  },
  // Tentativa 3: Googlebot (alguns CDNs permitem crawlers)
  {
    "User-Agent": "Googlebot-Image/1.0",
    "Accept": "image/*",
  },
];

async function tryFetch(url: string): Promise<{ base64: string; mimeType: string } | null> {
  for (const headers of HEADERS_LIST) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers,
      });
      if (!res.ok) continue;

      const ct = res.headers.get("content-type") ?? "";
      // Aceita image/* ou octet-stream (alguns CDNs não declaram content-type correto)
      const isImage = ct.startsWith("image/") || ct === "application/octet-stream" || ct === "";
      if (!isImage) continue;

      const buffer = await res.arrayBuffer();
      // Mínimo reduzido para 5KB — imagens menores são válidas (ícones, fotos comprimidas)
      if (buffer.byteLength < 5000) continue;

      const mimeType = ct.startsWith("image/") ? ct.split(";")[0] : "image/jpeg";
      return { base64: Buffer.from(buffer).toString("base64"), mimeType };
    } catch {
      continue;
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const { url, thumbUrl } = await req.json();
  if (!url?.startsWith("http")) return NextResponse.json({ error: "URL inválida" }, { status: 400 });

  // Tenta URL principal, depois thumbnail como fallback
  const result = (await tryFetch(url)) ?? (thumbUrl ? await tryFetch(thumbUrl) : null);

  if (!result) {
    return NextResponse.json({ error: "Imagem bloqueada pelo site de origem. Tente outra." }, { status: 400 });
  }

  return NextResponse.json(result);
}
