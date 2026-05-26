import { NextRequest, NextResponse } from "next/server";
import { redisSetex } from "@/lib/redis";
import { v4 as uuid } from "uuid";

export const maxDuration = 20;

const MAX_B64_BYTES = 900 * 1024; // ~675KB binary — safe under Upstash 1MB body limit
const TTL_SECONDS   = 900;        // 15 min — more than enough for Instagram to process

export async function POST(req: NextRequest) {
  const { base64, mimeType = "image/jpeg" } = await req.json();
  if (!base64) return NextResponse.json({ error: "base64 obrigatório" }, { status: 400 });

  const sizeKB = Math.round(base64.length / 1024);
  console.log(`[ig-media] storing ${sizeKB}KB in Redis`);

  if (base64.length > MAX_B64_BYTES) {
    return NextResponse.json(
      { error: `Imagem muito grande (${sizeKB}KB). Reduza a qualidade e tente novamente.` },
      { status: 400 }
    );
  }

  try {
    const id  = uuid();
    const key = `ig:media:${id}`;
    await redisSetex(key, TTL_SECONDS, JSON.stringify({ b64: base64, mime: mimeType }));

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://xpostzone.online";
    const url = `${baseUrl}/api/instagram/media/${id}`;
    console.log(`[ig-media] stored OK → ${id}`);
    return NextResponse.json({ url });
  } catch (err: any) {
    console.error("[ig-media]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
