import { NextResponse } from "next/server";
import { processPendingPosts } from "@/lib/schedule-publish";

export const maxDuration = 300;

// Vercel chama este endpoint a cada minuto (vercel.json crons)
// Não precisa de auth — rotas API não são redirecionadas para xpostzone.online
export async function GET() {
  try {
    const result = await processPendingPosts();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("[cron]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
