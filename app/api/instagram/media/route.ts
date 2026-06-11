import { NextRequest, NextResponse } from "next/server";
import { redisSetex } from "@/lib/redis";
import { v4 as uuid } from "uuid";

export const maxDuration = 20;

const TTL = 3600; // 60 min

export async function POST(req: NextRequest) {
  const { base64, mimeType = "image/jpeg" } = await req.json();
  if (!base64) return NextResponse.json({ error: "base64 obrigatório" }, { status: 400 });

  const id  = uuid();
  const key = `ig:media:${id}`;
  // Armazena "mimeType|base64" — simples, sem JSON wrapper
  await redisSetex(key, TTL, `${mimeType}|${base64}`);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://xpostzone.online";
  return NextResponse.json({ url: `${baseUrl}/api/instagram/media/${id}` });
}
