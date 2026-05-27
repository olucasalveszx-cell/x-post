import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { v4 as uuid } from "uuid";

export const maxDuration = 30;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("user_personal_photos")
    .select("id, public_url, filename, size_bytes, created_at")
    .eq("user_email", session.user.email)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { dataUrl, filename } = await req.json();
  if (!dataUrl) return NextResponse.json({ error: "dataUrl obrigatório" }, { status: 400 });

  const email = session.user.email;
  const [header, base64] = dataUrl.split(",");
  const mimeType = header.match(/data:(.*);base64/)?.[1] ?? "image/jpeg";
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const path = `${email}/${uuid()}.${ext}`;
  const buffer = Buffer.from(base64, "base64");

  const { error: uploadError } = await supabaseAdmin.storage
    .from("personal-photos")
    .upload(path, buffer, { contentType: mimeType, upsert: false });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  // Bucket privado → signed URL de 1 ano para exibição permanente
  const { data: signed, error: signError } = await supabaseAdmin.storage
    .from("personal-photos")
    .createSignedUrl(path, 365 * 24 * 3600);

  if (signError) return NextResponse.json({ error: signError.message }, { status: 500 });

  const { data, error } = await supabaseAdmin
    .from("user_personal_photos")
    .insert({
      user_email:   email,
      storage_path: path,
      public_url:   signed.signedUrl,
      filename:     filename ?? path.split("/").pop(),
      size_bytes:   buffer.length,
    })
    .select("id, public_url, filename, size_bytes, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
