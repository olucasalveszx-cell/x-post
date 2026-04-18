import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redisLPush, redisLTrim, redisLRange } from "@/lib/redis";

export const maxDuration = 30;

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const [histRaw, imgsRaw] = await Promise.all([
    redisLRange(`user:hist:${email}`, 0, 29),
    redisLRange(`user:imgs:${email}`, 0, 99),
  ]);

  const history = histRaw.map((r) => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean);
  const images  = imgsRaw.map((r) => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean);

  return NextResponse.json({ history, images });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { type, entry } = body;

  if (type === "history") {
    const value = JSON.stringify({ ...entry, createdAt: new Date().toISOString() });
    await redisLPush(`user:hist:${email}`, value);
    await redisLTrim(`user:hist:${email}`, 0, 29);
  } else if (type === "image") {
    const value = JSON.stringify({ ...entry, savedAt: new Date().toISOString() });
    await redisLPush(`user:imgs:${email}`, value);
    await redisLTrim(`user:imgs:${email}`, 0, 99);
  } else {
    return NextResponse.json({ error: "type inválido" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
