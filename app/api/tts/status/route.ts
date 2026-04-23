import { NextResponse } from "next/server";

export async function GET() {
  const API_KEY = process.env.OPENAI_API_KEY ?? "";
  if (!API_KEY) return NextResponse.json({ ok: false, reason: "OPENAI_API_KEY not set" });

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "tts-1", input: "ok", voice: "nova", response_format: "mp3" }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return NextResponse.json({ ok: false, status: res.status, body });
  }

  return NextResponse.json({ ok: true, provider: "openai", voice: "nova" });
}
