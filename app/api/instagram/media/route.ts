import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { base64, mimeType = "image/jpeg" } = await req.json();
  if (!base64) return NextResponse.json({ error: "base64 obrigatório" }, { status: 400 });

  const sizeKB = Math.round(base64.length / 1024);
  console.log(`[ig-media] uploading ${sizeKB}KB to Blob`);

  try {
    const buffer = Buffer.from(base64, "base64");
    const ext    = mimeType.split("/")[1] ?? "jpg";
    const blob   = await put(`ig-media/${Date.now()}.${ext}`, buffer, {
      access: "public",
      contentType: mimeType,
    });

    console.log(`[ig-media] uploaded OK → ${blob.url}`);
    return NextResponse.json({ url: blob.url });
  } catch (err: any) {
    console.error("[ig-media]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
