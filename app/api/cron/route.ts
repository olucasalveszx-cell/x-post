import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

// Vercel Cron chama GET com Authorization: Bearer <CRON_SECRET>
// Internamente repassa para o PATCH do /api/schedule que processa os posts vencidos
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://xpostzone.online";
  const res = await fetch(`${base}/api/schedule`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  const data = await res.json();
  return NextResponse.json(data);
}
