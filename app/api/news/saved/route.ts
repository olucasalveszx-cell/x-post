import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getNewsByIds } from "@/lib/news";

// GET — lista notícias salvas do usuário
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { data: rows } = await supabaseAdmin
    .from("saved_news")
    .select("news_id, created_at")
    .eq("user_id", session.user.email)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!rows?.length) return NextResponse.json({ saved: [] });

  const ids = rows.map((r: any) => r.news_id as string);
  const news = await getNewsByIds(ids);

  // Mantém a ordem de salvamento
  const ordered = ids
    .map((id) => news.find((n) => n.id === id))
    .filter(Boolean);

  return NextResponse.json({ saved: ordered });
}

// POST — salvar notícia
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { newsId } = await req.json();
  if (!newsId) return NextResponse.json({ error: "newsId obrigatório" }, { status: 400 });

  const { error } = await supabaseAdmin.from("saved_news").upsert(
    { user_id: session.user.email, news_id: newsId },
    { onConflict: "user_id,news_id", ignoreDuplicates: true },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE — remover notícia salva
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { newsId } = await req.json();
  if (!newsId) return NextResponse.json({ error: "newsId obrigatório" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("saved_news")
    .delete()
    .eq("user_id", session.user.email)
    .eq("news_id", newsId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
