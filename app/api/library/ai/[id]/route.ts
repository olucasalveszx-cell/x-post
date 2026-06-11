import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: row, error: fetchError } = await supabaseAdmin
    .from("ai_image_library")
    .select("storage_path, user_email")
    .eq("id", params.id)
    .single();

  if (fetchError || !row) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  if (row.user_email !== session.user.email) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  await supabaseAdmin.storage.from("ai-library").remove([row.storage_path]);

  const { error } = await supabaseAdmin.from("ai_image_library").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return new NextResponse(null, { status: 204 });
}
