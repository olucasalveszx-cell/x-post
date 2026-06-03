import { NextRequest, NextResponse } from "next/server";
import { processPendingPosts } from "@/lib/schedule-publish";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processPendingPosts();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("[cron]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
