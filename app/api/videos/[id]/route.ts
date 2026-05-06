import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin, VIDEOS_BUCKET } from "@/lib/supabase";

// GET — single video with scheduled posts
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("videos")
    .select(`*, scheduled_posts(*)`)
    .eq("id", params.id)
    .eq("user_id", session.user.email)
    .single();

  if (error || !data)
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return NextResponse.json({ video: data });
}

// PATCH — update title or status
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: existing } = await supabaseAdmin
    .from("videos")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", session.user.email)
    .single();

  if (!existing)
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const body = await req.json();
  const allowed: Record<string, unknown> = {};
  if (body.title) allowed.title = body.title;
  if (body.status) allowed.status = body.status;

  const { data, error } = await supabaseAdmin
    .from("videos")
    .update(allowed)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ video: data });
}

// DELETE — remove video + storage files
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: video } = await supabaseAdmin
    .from("videos")
    .select("id, storage_path")
    .eq("id", params.id)
    .eq("user_id", session.user.email)
    .single();

  if (!video) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  // Remove files from storage
  const filesToRemove = [video.storage_path, `${params.id}/thumb.jpg`];
  await supabaseAdmin.storage.from(VIDEOS_BUCKET).remove(filesToRemove);

  // Cascade deletes scheduled_posts via DB FK
  const { error } = await supabaseAdmin
    .from("videos")
    .delete()
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
