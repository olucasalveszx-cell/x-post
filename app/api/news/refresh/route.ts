import { NextRequest, NextResponse } from "next/server";
import { refreshAllCategories, getNews } from "@/lib/news";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // Refresh de categoria específica (usuário) ou todas (cron/admin)
    const body = await req.json().catch(() => ({}));
    const category = body.category as string | undefined;

    if (category) {
      const news = await getNews(category, 1, 20, true);
      return NextResponse.json({ ok: true, count: news.length, category });
    }

    // Refresh completo — só via CRON_SECRET
    const auth = req.headers.get("authorization") || "";
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ok: refreshed, failed } = await refreshAllCategories();
    return NextResponse.json({ ok: true, refreshed, failed });
  } catch (err: any) {
    console.error("[api/news/refresh]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
