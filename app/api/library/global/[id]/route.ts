import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.toLowerCase().trim();

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (session.user.email.toLowerCase() !== ADMIN_EMAIL)
    return NextResponse.json({ error: "Acesso restrito ao admin" }, { status: 403 });

  const { data: row, error: fetchError } = await supabaseAdmin
    .from("global_image_library")
    .select("storage_path")
    .eq("id", params.id)
    .single();

  if (fetchError || !row) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  await supabaseAdmin.storage.from("global-ai-library").remove([row.storage_path]);

  const { error } = await supabaseAdmin.from("global_image_library").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return new NextResponse(null, { status: 204 });
}
