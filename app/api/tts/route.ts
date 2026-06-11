import { NextRequest, NextResponse } from "next/server";

function cleanForSpeech(raw: string): string {
  return raw
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
    .replace(/[\u{2600}-\u{27BF}]/gu, "")
    .replace(/[︀-️]/g, "")
    .replace(/‍/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_{1,2}(.*?)_{1,2}/g, "$1")
    .replace(/#{1,6}\s*/g, "")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[\-\*•]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/—/g, ", ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "No text" }, { status: 400 });

  const clean = cleanForSpeech(text);
  if (!clean) return NextResponse.json({ error: "No text after cleaning" }, { status: 400 });

  const API_KEY = process.env.OPENAI_API_KEY ?? "";
  if (!API_KEY) return NextResponse.json({ error: "TTS not configured" }, { status: 503 });

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "tts-1",
      input: clean,
      voice: "nova",
      response_format: "mp3",
    }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    console.error("[TTS] OpenAI erro", res.status, msg);
    return NextResponse.json({ error: msg || "TTS error" }, { status: res.status });
  }

  // Pipe direto da OpenAI pro cliente — sem bufferizar tudo na memória
  return new NextResponse(res.body, { headers: { "Content-Type": "audio/mpeg" } });
}
