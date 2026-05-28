import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = "schedule-images";

async function ensureBucket() {
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (!data) {
    await supabase.storage.createBucket(BUCKET, { public: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType, filename } = await req.json();
    if (!imageBase64 || !mimeType) {
      return NextResponse.json({ error: "imageBase64 e mimeType obrigatórios" }, { status: 400 });
    }

    await ensureBucket();

    const buffer = Buffer.from(imageBase64, "base64");
    const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
    const name = filename ?? `slide-${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(name, buffer, { contentType: mimeType, upsert: true });

    if (error) throw new Error(error.message);

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err: any) {
    console.error("[blob-upload]", err);
    return NextResponse.json({ error: err.message ?? "Erro no upload" }, { status: 500 });
  }
}
