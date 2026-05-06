import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin, VIDEOS_BUCKET, ensureVideosBucket } from "@/lib/supabase";

// GET — list user videos
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("videos")
    .select(`*, scheduled_posts(*)`)
    .eq("user_id", session.user.email)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ videos: data ?? [] });
}

// POST — create video record after client-side upload
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { videoId, title, videoPath, thumbnailBase64, fileSize, duration } =
    await req.json();

  if (!videoId || !title || !videoPath)
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });

  await ensureVideosBucket();

  // Upload thumbnail if provided
  let thumbnailUrl: string | null = null;
  if (thumbnailBase64) {
    try {
      const base64Data = thumbnailBase64.replace(/^data:image\/\w+;base64,/, "");
      const thumbBuffer = Buffer.from(base64Data, "base64");
      const thumbPath = `${videoId}/thumb.jpg`;
      const { error: thumbError } = await supabaseAdmin.storage
        .from(VIDEOS_BUCKET)
        .upload(thumbPath, thumbBuffer, { contentType: "image/jpeg", upsert: true });
      if (!thumbError) {
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from(VIDEOS_BUCKET)
          .getPublicUrl(thumbPath);
        thumbnailUrl = publicUrl;
      }
    } catch {
      // thumbnail is optional, continue without it
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const fileUrl = `${supabaseUrl}/storage/v1/object/public/${VIDEOS_BUCKET}/${videoPath}`;

  const { data, error } = await supabaseAdmin
    .from("videos")
    .insert({
      id: videoId,
      user_id: session.user.email,
      title,
      file_url: fileUrl,
      storage_path: videoPath,
      thumbnail_url: thumbnailUrl,
      file_size: fileSize ?? 0,
      duration: duration ?? null,
      status: "draft",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ video: data }, { status: 201 });
}
