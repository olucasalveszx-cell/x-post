import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 20;

async function tryFetch(url: string, headers: Record<string, string>): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers });
    if (!res.ok) return null;

    const ct = res.headers.get("content-type") ?? "";
    const isImage = ct.startsWith("image/") || ct === "application/octet-stream" || ct === "";
    if (!isImage) return null;

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength < 1000) return null; // mínimo 1KB

    const mimeType = ct.startsWith("image/") ? ct.split(";")[0] : "image/jpeg";
    return { base64: Buffer.from(buffer).toString("base64"), mimeType };
  } catch {
    return null;
  }
}

async function fetchImage(url: string): Promise<{ base64: string; mimeType: string } | null> {
  const origin = (() => { try { return new URL(url).origin; } catch { return ""; } })();

  const strategies: Record<string, string>[] = [
    // 1 — Referer = próprio site (bypassa hotlink protection)
    {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      "Referer": origin + "/",
    },
    // 2 — Requisição limpa, sem headers extras (CDNs abertos)
    {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "image/*,*/*;q=0.8",
    },
    // 3 — Referer = Google (sites que permitem tráfego vindo de busca)
    {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      "Accept": "image/*,*/*;q=0.8",
      "Referer": "https://www.google.com/",
    },
    // 4 — Safari sem Referer
    {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      "Accept": "image/*",
    },
    // 5 — Googlebot (CDNs que liberam crawlers)
    {
      "User-Agent": "Googlebot-Image/1.0",
      "Accept": "image/*",
    },
  ];

  for (const headers of strategies) {
    const result = await tryFetch(url, headers);
    if (result) return result;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const { url, thumbUrl } = await req.json();
  if (!url?.startsWith("http")) return NextResponse.json({ error: "URL inválida" }, { status: 400 });

  const result = (await fetchImage(url)) ?? (thumbUrl ? await fetchImage(thumbUrl) : null);

  if (!result) {
    return NextResponse.json({ error: "Imagem bloqueada pelo site de origem. Tente outra." }, { status: 400 });
  }

  return NextResponse.json(result);
}
