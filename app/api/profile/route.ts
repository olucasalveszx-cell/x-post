import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redisGet, redisSet, redisLPush, redisLTrim, redisLRange } from "@/lib/redis";

export const maxDuration = 30;

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const [histRaw, imgsRaw, profilesRaw] = await Promise.all([
    redisLRange(`user:hist:${email}`, 0, 29),
    redisLRange(`user:imgs:${email}`, 0, 99),
    redisGet(`user:profiles:${email}`),
  ]);

  const history  = histRaw.map((r) => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean);
  const images   = imgsRaw.map((r) => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean);
  const profiles = profilesRaw ? (() => { try { return JSON.parse(profilesRaw); } catch { return []; } })() : [];

  return NextResponse.json({ history, images, profiles });
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
  } else if (type === "profiles") {
    await redisSet(`user:profiles:${email}`, JSON.stringify(entry));
  } else {
    return NextResponse.json({ error: "type inválido" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
