import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { base64, mimeType = "image/jpeg" } = await req.json();
  if (!base64) return NextResponse.json({ error: "base64 obrigatório" }, { status: 400 });

  try {
    const buffer = Buffer.from(base64, "base64");
    const ext    = mimeType.split("/")[1] ?? "jpg";
    const blob   = await put(`ig-media/${Date.now()}.${ext}`, buffer, {
      access: "public",
      contentType: mimeType,
    } as any);

    return NextResponse.json({ url: blob.url });
  } catch (err: any) {
    console.error("[ig-media]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
