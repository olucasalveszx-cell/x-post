import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 15;

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url?.startsWith("http")) return NextResponse.json({ error: "URL inválida" }, { status: 400 });

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
    });
    if (!res.ok) return NextResponse.json({ error: `HTTP ${res.status}` }, { status: 400 });

    const ct = res.headers.get("content-type") ?? "image/jpeg";
    if (!ct.startsWith("image/")) return NextResponse.json({ error: "Não é uma imagem" }, { status: 400 });

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength < 5000) return NextResponse.json({ error: "Imagem muito pequena" }, { status: 400 });

    const base64 = Buffer.from(buffer).toString("base64");
    const mimeType = ct.split(";")[0];

    return NextResponse.json({ base64, mimeType });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Erro ao baixar imagem" }, { status: 500 });
  }
}
