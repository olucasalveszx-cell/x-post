import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { randomUUID } from "crypto";

const BUCKET = "ai-training-sources";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filename    = searchParams.get("filename") ?? "file";
  const contentType = searchParams.get("contentType") ?? "application/octet-stream";

  const ext  = filename.split(".").pop() ?? "bin";
  const path = `${email.replace("@", "_").replace(".", "_")}/${randomUUID()}.${ext}`;

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? "Falha ao gerar URL de upload" }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: data.signedUrl, path });
}
