import { NextRequest, NextResponse } from "next/server";
import { SearchResult } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { topic } = await req.json();

    if (!topic) {
      return NextResponse.json({ error: "Tópico é obrigatório" }, { status: 400 });
    }

    const apiKey = process.env.SERPER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "SERPER_API_KEY não configurada no .env.local" },
        { status: 500 }
      );
    }

    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: `${topic} 2024 2025 dados estatísticas tendências`,
        gl: "br",
        hl: "pt",
        num: 8,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message ?? "Erro ao buscar" },
        { status: response.status }
      );
    }

    const results: SearchResult[] = (data.organic ?? []).map((item: any) => ({
      title: item.title,
      snippet: item.snippet,
      link: item.link,
    }));

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[search]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
