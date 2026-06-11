import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data } = await supabaseAdmin
    .from("user_ai_profile")
    .select("*")
    .eq("user_email", email)
    .single();

  return NextResponse.json({ profile: data ?? null });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const {
    brand_voice, writing_style, preferred_structure,
    forbidden_terms, target_audience, main_topics,
  } = body;

  const payload = {
    user_email: email,
    brand_voice:         brand_voice         ?? null,
    writing_style:       writing_style       ?? null,
    preferred_structure: preferred_structure ?? null,
    forbidden_terms:     forbidden_terms     ?? [],
    target_audience:     target_audience     ?? null,
    main_topics:         main_topics         ?? [],
    updated_at:          new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from("user_ai_profile")
    .upsert(payload, { onConflict: "user_email" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ profile: data });
}
