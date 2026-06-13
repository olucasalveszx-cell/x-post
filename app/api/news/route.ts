import { NextRequest, NextResponse } from "next/server";
import { getNews } from "@/lib/news";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category     = searchParams.get("category")      || "geral";
    const page         = parseInt(searchParams.get("page")  || "1", 10);
    const limit        = parseInt(searchParams.get("limit") || "20", 10);
    const forceRefresh = searchParams.get("refresh")        === "true";
    const hoursParam   = searchParams.get("hours");
    const hours        = hoursParam ? parseInt(hoursParam, 10) : undefined;

    const news = await getNews(category, page, Math.min(limit, 50), forceRefresh, hours);
    return NextResponse.json({ news, page, category });
  } catch (err: any) {
    console.error("[api/news]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
