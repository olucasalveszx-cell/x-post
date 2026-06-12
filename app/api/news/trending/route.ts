import { NextResponse } from "next/server";
import { getTrending } from "@/lib/news";

export const maxDuration = 30;

export async function GET() {
  try {
    const trending = await getTrending();
    return NextResponse.json({ trending });
  } catch (err: any) {
    console.error("[api/news/trending]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
