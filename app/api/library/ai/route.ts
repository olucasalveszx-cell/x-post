import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin, assertSupabaseConfigured } from "@/lib/supabase";
import { v4 as uuid } from "uuid";

export const maxDuration = 30;

export async function GET() {
  try { assertSupabaseConfigured(); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 503 }); }
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("ai_image_library")
    .select("id, public_url, prompt, model, width, height, created_at")
    .eq("user_email", session.user.email)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { dataUrl, imageUrl, prompt, model, width, height } = await req.json();
  if (!dataUrl && !imageUrl) return NextResponse.json({ error: "dataUrl ou imageUrl obrigatório" }, { status: 400 });

  const email = session.user.email;

  let buffer: Buffer;
  let mimeType: string;

  if (dataUrl) {
    const [header, base64] = dataUrl.split(",");
    mimeType = header.match(/data:(.*);base64/)?.[1] ?? "image/jpeg";
    buffer = Buffer.from(base64, "base64");
  } else {
    // Fetch da URL externa
    const response = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) return NextResponse.json({ error: "Falha ao baixar imagem" }, { status: 502 });
    mimeType = response.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
    buffer = Buffer.from(await response.arrayBuffer());
  }

  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const path = `${email}/${uuid()}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("ai-library")
    .upload(path, buffer, { contentType: mimeType, upsert: false });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = supabaseAdmin.storage.from("ai-library").getPublicUrl(path);

  const { data, error } = await supabaseAdmin
    .from("ai_image_library")
    .insert({ user_email: email, storage_path: path, public_url: publicUrl, prompt, model, width, height })
    .select("id, public_url, prompt, model, width, height, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
