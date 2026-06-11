import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ tracks: [] });

  try {
    const res = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=12&order=RANKING`,
      { next: { revalidate: 60 } }
    );
    const data = await res.json();
    const tracks = (data.data ?? []).map((t: any) => ({
      id: t.id,
      title: t.title,
      artist: t.artist.name,
      album: t.album.title,
      cover: t.album.cover_medium,
      preview: t.preview,
      duration: t.duration,
    }));
    return NextResponse.json({ tracks });
  } catch (err: any) {
    return NextResponse.json({ tracks: [], error: err.message }, { status: 500 });
  }
}
