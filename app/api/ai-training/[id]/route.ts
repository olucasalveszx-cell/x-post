import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("ai_training_sources")
    .select("*")
    .eq("id", params.id)
    .eq("user_email", email)
    .single();

  if (error || !data) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return NextResponse.json({ source: data });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  // Verify ownership
  const { data: source } = await supabaseAdmin
    .from("ai_training_sources")
    .select("id,original_file_url")
    .eq("id", params.id)
    .eq("user_email", email)
    .single();

  if (!source) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  // Delete file from storage if it exists
  if (source.original_file_url) {
    const path = source.original_file_url.split("/ai-training-sources/").pop();
    if (path) {
      await supabaseAdmin.storage.from("ai-training-sources").remove([path]);
    }
  }

  // Cascade delete handles chunks via FK
  const { error } = await supabaseAdmin
    .from("ai_training_sources")
    .delete()
    .eq("id", params.id)
    .eq("user_email", email);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
