import { NextResponse } from "next/server";

export async function GET() {
  const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "";
  const API_KEY  = process.env.ELEVENLABS_API_KEY ?? "";

  if (!VOICE_ID || !API_KEY) {
    return NextResponse.json({ ok: false, reason: "env vars not set", voice: !!VOICE_ID, key: !!API_KEY });
  }

  // Testa com texto mínimo
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: "POST",
    headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      text: "ok",
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return NextResponse.json({ ok: false, status: res.status, body });
  }

  return NextResponse.json({ ok: true, voice_id: VOICE_ID.slice(0, 6) + "..." });
}
