import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { base64, mime } = await req.json();
    if (!base64 || !mime) return NextResponse.json({ error: "base64 e mime obrigatórios" }, { status: 400 });

    const buffer = Buffer.from(base64, "base64");
    const ext = mime.split("/")[1]?.split("+")[0] ?? "jpg";
    const blob = await put(
      `facerefs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`,
      buffer,
      { access: "public" as any, contentType: mime }
    );

    return NextResponse.json({ url: blob.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Erro no upload" }, { status: 500 });
  }
}
