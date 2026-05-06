import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { ScheduledPostStatus } from "@/types";

// PATCH — update status (cancel, etc.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: post } = await supabaseAdmin
    .from("scheduled_posts")
    .select("id, video_id, status")
    .eq("id", params.id)
    .eq("user_id", session.user.email)
    .single();

  if (!post) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { status } = await req.json() as { status: ScheduledPostStatus };
  const allowed: ScheduledPostStatus[] = ["cancelled"];
  if (!allowed.includes(status))
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });

  const { data: updated, error } = await supabaseAdmin
    .from("scheduled_posts")
    .update({ status })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If cancelled, check if video has other pending posts; if not, revert to draft
  if (status === "cancelled") {
    const { count } = await supabaseAdmin
      .from("scheduled_posts")
      .select("id", { count: "exact", head: true })
      .eq("video_id", post.video_id)
      .eq("status", "pending");

    if ((count ?? 0) === 0) {
      await supabaseAdmin
        .from("videos")
        .update({ status: "draft" })
        .eq("id", post.video_id);
    }
  }

  return NextResponse.json({ post: updated });
}

// DELETE — remove scheduled post permanently
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: post } = await supabaseAdmin
    .from("scheduled_posts")
    .select("id, video_id")
    .eq("id", params.id)
    .eq("user_id", session.user.email)
    .single();

  if (!post) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { error } = await supabaseAdmin
    .from("scheduled_posts")
    .delete()
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Revert video to draft if no more pending posts
  const { count } = await supabaseAdmin
    .from("scheduled_posts")
    .select("id", { count: "exact", head: true })
    .eq("video_id", post.video_id)
    .eq("status", "pending");

  if ((count ?? 0) === 0) {
    await supabaseAdmin
      .from("videos")
      .update({ status: "draft" })
      .eq("id", post.video_id);
  }

  return NextResponse.json({ ok: true });
}
