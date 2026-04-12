import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType, filename } = await req.json();
    if (!imageBase64 || !mimeType) {
      return NextResponse.json({ error: "imageBase64 e mimeType obrigatórios" }, { status: 400 });
    }

    const buffer = Buffer.from(imageBase64, "base64");
    const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
    const name = filename ?? `slide-${Date.now()}.${ext}`;

    const blob = await put(name, buffer, {
      access: "public",
      contentType: mimeType,
    });

    return NextResponse.json({ url: blob.url });
  } catch (err: any) {
    console.error("[blob-upload]", err);
    return NextResponse.json({ error: err.message ?? "Erro no upload" }, { status: 500 });
  }
}
