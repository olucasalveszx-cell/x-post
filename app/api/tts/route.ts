import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "No text" }, { status: 400 });

  const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "";
  const API_KEY  = process.env.ELEVENLABS_API_KEY ?? "";

  if (!VOICE_ID || !API_KEY) {
    return NextResponse.json({ error: "TTS not configured" }, { status: 503 });
  }

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: "POST",
    headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    console.error("[TTS] ElevenLabs erro", res.status, msg);
    return NextResponse.json({ error: msg || "ElevenLabs error" }, { status: res.status });
  }

  const audio = await res.arrayBuffer();
  return new NextResponse(audio, { headers: { "Content-Type": "audio/mpeg" } });
}
