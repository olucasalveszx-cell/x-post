import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { redisSetex } from "@/lib/redis";
import { v4 as uuid } from "uuid";

export const maxDuration = 30;

const TTL_SECONDS = 900; // 15 min

export async function POST(req: NextRequest) {
  const { base64, mimeType = "image/jpeg" } = await req.json();
  if (!base64) return NextResponse.json({ error: "base64 obrigatório" }, { status: 400 });

  const sizeKB = Math.round(base64.length / 1024);
  console.log(`[ig-media] uploading ${sizeKB}KB to Blob`);

  try {
    const buffer = Buffer.from(base64, "base64");
    const ext    = mimeType.split("/")[1] ?? "jpg";

    // Upload para Vercel Blob (store privado — sem access: public)
    // A URL do blob é acessível server-side com BLOB_READ_WRITE_TOKEN
    const blob = await put(`ig-media/${Date.now()}.${ext}`, buffer, {
      contentType: mimeType,
      access: "private",
    });

    // Armazena só a URL no Redis (string pequena, < 200 bytes)
    const id = uuid();
    await redisSetex(`ig:media:${id}`, TTL_SECONDS, blob.url);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://xpostzone.online";
    console.log(`[ig-media] OK → ${id}`);
    return NextResponse.json({ url: `${baseUrl}/api/instagram/media/${id}` });
  } catch (err: any) {
    console.error("[ig-media]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
