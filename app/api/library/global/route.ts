import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { v4 as uuid } from "uuid";

export const maxDuration = 30;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.toLowerCase().trim();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tag    = searchParams.get("tag");
  const limit  = Math.min(Number(searchParams.get("limit") ?? 50), 100);
  const offset = Number(searchParams.get("offset") ?? 0);

  let query = supabaseAdmin
    .from("global_image_library")
    .select("id, public_url, title, tags, created_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (tag) query = query.contains("tags", [tag]);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (session.user.email.toLowerCase() !== ADMIN_EMAIL)
    return NextResponse.json({ error: "Acesso restrito ao admin" }, { status: 403 });

  const { dataUrl, title, tags } = await req.json();
  if (!dataUrl) return NextResponse.json({ error: "dataUrl obrigatório" }, { status: 400 });

  const email = session.user.email;
  const [header, base64] = dataUrl.split(",");
  const mimeType = header.match(/data:(.*);base64/)?.[1] ?? "image/jpeg";
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const path = `${email}/${uuid()}.${ext}`;
  const buffer = Buffer.from(base64, "base64");

  const { error: uploadError } = await supabaseAdmin.storage
    .from("global-ai-library")
    .upload(path, buffer, { contentType: mimeType, upsert: false });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = supabaseAdmin.storage.from("global-ai-library").getPublicUrl(path);

  const { data, error } = await supabaseAdmin
    .from("global_image_library")
    .insert({ admin_email: email, storage_path: path, public_url: publicUrl, title, tags: tags ?? [] })
    .select("id, public_url, title, tags, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
