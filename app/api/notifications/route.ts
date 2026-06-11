import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redisGet, redisSet, redisLRange } from "@/lib/redis";

export const maxDuration = 15;

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const [personalRaw, globalRaw, lastReadRaw] = await Promise.all([
    redisLRange(`user:notifs:${email}`, 0, 49),
    redisLRange("global:notifs", 0, 29),
    redisGet(`user:notifs:last_read:${email}`),
  ]);

  const parse = (raw: string[]) =>
    raw.map((r) => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean);

  const personal = parse(personalRaw);
  const global = parse(globalRaw);

  const all: any[] = [...personal, ...global].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const lastReadTs = lastReadRaw ? new Date(lastReadRaw).getTime() : 0;
  const unread = all.filter((n) => new Date(n.createdAt).getTime() > lastReadTs).length;

  return NextResponse.json({ notifications: all, unread });
}

export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  await redisSet(`user:notifs:last_read:${email}`, new Date().toISOString());
  return NextResponse.json({ ok: true });
}
