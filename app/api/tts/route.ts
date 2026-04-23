import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "No text" }, { status: 400 });

  const API_KEY = process.env.OPENAI_API_KEY ?? "";
  if (!API_KEY) return NextResponse.json({ error: "TTS not configured" }, { status: 503 });

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "tts-1",
      input: text,
      voice: "nova",
      response_format: "mp3",
    }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    console.error("[TTS] OpenAI erro", res.status, msg);
    return NextResponse.json({ error: msg || "TTS error" }, { status: res.status });
  }

  const audio = await res.arrayBuffer();
  return new NextResponse(audio, { headers: { "Content-Type": "audio/mpeg" } });
}
