import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin, VIDEOS_BUCKET, ensureVideosBucket } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

const ALLOWED_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const MAX_SIZE = 500 * 1024 * 1024; // 500MB

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { filename, contentType, fileSize } = await req.json();

  if (!ALLOWED_TYPES.includes(contentType))
    return NextResponse.json(
      { error: "Formato inválido. Use MP4, MOV ou WebM." },
      { status: 400 }
    );

  if (fileSize > MAX_SIZE)
    return NextResponse.json(
      { error: "Arquivo muito grande. Máximo permitido: 500MB." },
      { status: 400 }
    );

  await ensureVideosBucket();

  const videoId = uuidv4();
  const ext = filename.split(".").pop()?.toLowerCase() ?? "mp4";
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const videoPath = `${videoId}/${safeName}`;

  const { data, error } = await supabaseAdmin.storage
    .from(VIDEOS_BUCKET)
    .createSignedUploadUrl(videoPath);

  if (error || !data)
    return NextResponse.json({ error: "Erro ao gerar URL de upload" }, { status: 500 });

  return NextResponse.json({
    videoId,
    videoPath,
    signedUrl: data.signedUrl,
    token: data.token,
  });
}
