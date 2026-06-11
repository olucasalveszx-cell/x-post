import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redisGet, redisSet } from "@/lib/redis";

function noteKey(email: string) { return `notes:${email}`; }

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ note: "" });
  const note = await redisGet(noteKey(session.user.email)).catch(() => "");
  return NextResponse.json({ note: note ?? "" });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { note } = await req.json();
  await redisSet(noteKey(session.user.email), note ?? "");
  return NextResponse.json({ ok: true });
}
