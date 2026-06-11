import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const maxDuration = 10;

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  const info = {
    url_set:        !!url,
    url_preview:    url ? `${url.slice(0, 30)}...` : "(vazio)",
    key_set:        !!key,
    key_length:     key.length,
    key_preview:    key ? `${key.slice(0, 20)}...${key.slice(-10)}` : "(vazio)",
    key_starts_eyj: key.startsWith("eyJ"),
    key_has_spaces: key.includes(" "),
    key_has_newline: key.includes("\n"),
  };

  // Tenta query simples
  let db_ok = false;
  let db_error = "";
  try {
    const { error } = await supabaseAdmin.from("ai_image_library").select("id").limit(1);
    db_ok = !error;
    db_error = error?.message ?? "";
  } catch (e: any) {
    db_error = e.message;
  }

  return NextResponse.json({ ...info, db_ok, db_error });
}
