import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 20;

export async function POST(req: NextRequest) {
  const { query } = await req.json();
  if (!query?.trim()) return NextResponse.json({ error: "query obrigatória" }, { status: 400 });

  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return NextResponse.json({ error: "UNSPLASH_ACCESS_KEY não configurada" }, { status: 500 });

  const q = encodeURIComponent(query.trim());
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${q}&orientation=portrait&per_page=20`,
    { headers: { Authorization: `Client-ID ${key}` }, signal: AbortSignal.timeout(10000) }
  );

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.errors?.[0] ?? "Unsplash error" }, { status: 500 });

  const images = (data.results ?? []).map((img: any) => ({
    url: img.urls?.regular ?? img.urls?.full,
    thumb: img.urls?.thumb ?? img.urls?.small,
    width: img.width,
    height: img.height,
    title: img.alt_description ?? img.description ?? "",
    source: img.user?.name ?? "Unsplash",
  })).filter((img: any) => img.url);

  return NextResponse.json({ images });
}
