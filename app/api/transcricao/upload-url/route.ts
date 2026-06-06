import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { randomUUID } from "crypto";

export const maxDuration = 15;

const BUCKET = "schedule-images";
const ALLOWED_TYPES: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "video/x-msvideo": "avi",
};

async function ensureBucket() {
  const { data } = await supabaseAdmin.storage.getBucket(BUCKET);
  if (!data) {
    await supabaseAdmin.storage.createBucket(BUCKET, { public: true });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const contentType = req.nextUrl.searchParams.get("contentType") ?? "audio/mpeg";
  const originalName = req.nextUrl.searchParams.get("filename") ?? "audio";

  const ext = ALLOWED_TYPES[contentType] ?? "mp3";
  if (!ALLOWED_TYPES[contentType]) {
    return NextResponse.json({ error: `Tipo não suportado: ${contentType}` }, { status: 400 });
  }

  await ensureBucket();

  const safeName = originalName.replace(/[^a-z0-9._-]/gi, "_").substring(0, 60);
  const path = `transcriptions/${email.replace(/[^a-z0-9]/gi, "_")}/${randomUUID()}_${safeName}.${ext}`;

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUploadUrl(path, { upsert: true });

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Erro ao gerar URL de upload" }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: data.signedUrl, path, token: data.token });
}
