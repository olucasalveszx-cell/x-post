import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 20;

export async function POST(req: NextRequest) {
  const { query } = await req.json();
  if (!query?.trim()) return NextResponse.json({ error: "query obrigatória" }, { status: 400 });

  const key = process.env.SERPER_API_KEY;
  if (!key) return NextResponse.json({ error: "SERPER_API_KEY não configurada" }, { status: 500 });

  const res = await fetch("https://google.serper.dev/images", {
    method: "POST",
    headers: { "X-API-KEY": key, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, gl: "br", hl: "pt", num: 20 }),
    signal: AbortSignal.timeout(12000),
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.message ?? "Serper error" }, { status: 500 });

  const images = (data.images ?? [])
    .filter((img: any) => img.imageUrl && img.imageWidth >= 300 && img.imageHeight >= 300)
    .slice(0, 16)
    .map((img: any) => ({
      url: img.imageUrl,
      thumb: img.thumbnailUrl ?? img.imageUrl,
      width: img.imageWidth,
      height: img.imageHeight,
      title: img.title ?? "",
      source: img.source ?? "",
    }));

  return NextResponse.json({ images });
}
