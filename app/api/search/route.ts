import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { topic } = await req.json();
    if (!topic?.trim()) return NextResponse.json({ results: [] });

    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) return NextResponse.json({ results: [] });

    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: topic, num: 8, gl: "br", hl: "pt" }),
    });

    if (!res.ok) return NextResponse.json({ results: [] });

    const data = await res.json();
    const results = (data.organic ?? []).slice(0, 4).map((r: any) => ({
      title: (r.title ?? "").slice(0, 120),
      snippet: (r.snippet ?? "").slice(0, 200),
      link: r.link ?? "",
    }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
