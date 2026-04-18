import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redisZAdd, redisZRemRangeByScore, redisSAdd, redisExpire } from "@/lib/redis";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ ok: false });

  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);

  // Presence em tempo real — sorted set com score=timestamp (TTL via cleanup)
  await redisZAdd("xpz:presence", now, email);
  // Remove presences com mais de 2 minutos
  await redisZRemRangeByScore("xpz:presence", "-inf", now - 120_000);

  // Usuários ativos hoje — set com expiração no fim do dia
  const activeKey = `xpz:active:${today}`;
  await redisSAdd(activeKey, email);
  await redisExpire(activeKey, 60 * 60 * 26); // expira 2h depois do dia acabar

  return NextResponse.json({ ok: true });
}
