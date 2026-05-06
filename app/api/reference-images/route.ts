import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin, VIDEOS_BUCKET, ensureVideosBucket } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

const REF_BUCKET = "references";

async function ensureRefBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if (!buckets?.some((b) => b.name === REF_BUCKET)) {
    await supabaseAdmin.storage.createBucket(REF_BUCKET, {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    });
  }
}

// GET — list user's reference images
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const onlyDefault = searchParams.get("default") === "true";

  let query = supabaseAdmin
    .from("user_reference_images")
    .select("*")
    .eq("user_id", session.user.email)
    .order("created_at", { ascending: false });

  if (onlyDefault) query = query.eq("is_default", true).limit(1);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (onlyDefault) {
    return NextResponse.json({ image: data?.[0] ?? null });
  }
  return NextResponse.json({ images: data ?? [] });
}

// POST — create reference image from base64
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { imageBase64, imageMime, label, setAsDefault } = await req.json();

  if (!imageBase64 || !imageMime)
    return NextResponse.json({ error: "Imagem obrigatória" }, { status: 400 });

  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(imageMime))
    return NextResponse.json({ error: "Formato inválido. Use JPG, PNG ou WebP." }, { status: 400 });

  await ensureRefBucket();

  const id = uuidv4();
  const ext = imageMime.split("/")[1] ?? "jpg";
  const storagePath = `${session.user.email}/${id}.${ext}`;

  // Upload to Supabase Storage
  const buffer = Buffer.from(imageBase64, "base64");
  const { error: uploadError } = await supabaseAdmin.storage
    .from(REF_BUCKET)
    .upload(storagePath, buffer, { contentType: imageMime, upsert: false });

  if (uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from(REF_BUCKET)
    .getPublicUrl(storagePath);

  // If setAsDefault, clear previous defaults
  if (setAsDefault) {
    await supabaseAdmin
      .from("user_reference_images")
      .update({ is_default: false })
      .eq("user_id", session.user.email);
  }

  const { data, error } = await supabaseAdmin
    .from("user_reference_images")
    .insert({
      id,
      user_id: session.user.email,
      image_url: publicUrl,
      storage_path: storagePath,
      label: label?.trim() || "Meu rosto",
      is_default: setAsDefault ?? false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ image: data }, { status: 201 });
}
