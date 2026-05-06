import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const REF_BUCKET = "references";

// PATCH — set as default or update label
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: existing } = await supabaseAdmin
    .from("user_reference_images")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", session.user.email)
    .single();

  if (!existing)
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const body = await req.json();

  if (body.is_default === true) {
    // Clear all other defaults for this user
    await supabaseAdmin
      .from("user_reference_images")
      .update({ is_default: false })
      .eq("user_id", session.user.email);
  }

  const updates: Record<string, unknown> = {};
  if (body.is_default !== undefined) updates.is_default = body.is_default;
  if (body.label) updates.label = body.label.trim();

  const { data, error } = await supabaseAdmin
    .from("user_reference_images")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ image: data });
}

// DELETE — remove reference image
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: image } = await supabaseAdmin
    .from("user_reference_images")
    .select("id, storage_path")
    .eq("id", params.id)
    .eq("user_id", session.user.email)
    .single();

  if (!image)
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  // Remove from storage
  await supabaseAdmin.storage.from(REF_BUCKET).remove([image.storage_path]);

  const { error } = await supabaseAdmin
    .from("user_reference_images")
    .delete()
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
