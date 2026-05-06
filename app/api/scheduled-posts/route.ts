import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { VideoPlatform } from "@/types";

const VALID_PLATFORMS: VideoPlatform[] = ["instagram", "tiktok", "youtube", "facebook"];

// GET — list user's scheduled posts
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get("video_id");

  let query = supabaseAdmin
    .from("scheduled_posts")
    .select(`*, video:videos(id, title, thumbnail_url, status)`)
    .eq("user_id", session.user.email)
    .order("scheduled_at", { ascending: true });

  if (videoId) query = query.eq("video_id", videoId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data ?? [] });
}

// POST — create scheduled post
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { videoId, platform, caption, scheduledAt } = await req.json();

  if (!videoId || !platform || !scheduledAt)
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });

  if (!VALID_PLATFORMS.includes(platform))
    return NextResponse.json({ error: "Plataforma inválida" }, { status: 400 });

  const scheduledDate = new Date(scheduledAt);
  if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date())
    return NextResponse.json(
      { error: "Data de agendamento inválida ou no passado" },
      { status: 400 }
    );

  // Verify video belongs to user
  const { data: video } = await supabaseAdmin
    .from("videos")
    .select("id, status")
    .eq("id", videoId)
    .eq("user_id", session.user.email)
    .single();

  if (!video) return NextResponse.json({ error: "Vídeo não encontrado" }, { status: 404 });

  // Create scheduled post
  const { data: post, error: postError } = await supabaseAdmin
    .from("scheduled_posts")
    .insert({
      user_id: session.user.email,
      video_id: videoId,
      platform,
      caption: caption ?? null,
      scheduled_at: scheduledAt,
      status: "pending",
    })
    .select()
    .single();

  if (postError) return NextResponse.json({ error: postError.message }, { status: 500 });

  // Update video status to scheduled
  await supabaseAdmin
    .from("videos")
    .update({ status: "scheduled" })
    .eq("id", videoId);

  return NextResponse.json({ post }, { status: 201 });
}
