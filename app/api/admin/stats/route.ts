import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/adminAuth";
import { redisListAll, redisGet, redisZCount, redisSCard } from "@/lib/redis";

export const maxDuration = 30;

function today() { return new Date().toISOString().slice(0, 10); }
function weekDates() {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value ?? "";
  if (!verifyAdminToken(token)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const now = Date.now();
  const t = today();

  const [
    emails,
    onlineNow,
    activeToday,
    carouselsTodayRaw,
    imagesTodayRaw,
    weekCarousels,
  ] = await Promise.all([
    redisListAll("users:list"),
    redisZCount("xpz:presence", now - 120_000, now),
    redisSCard(`xpz:active:${t}`),
    redisGet(`stats:carousels:${t}`),
    redisGet(`stats:images:${t}`),
    Promise.all(weekDates().map((d) => redisGet(`stats:carousels:${d}`))),
  ]);

  // Conta usuários com plano pago via Kirvano (Redis plan:email)
  let basicCount = 0, proCount = 0, businessCount = 0;
  if (emails.length > 0) {
    const planChecks = await Promise.all(
      emails.map((e: string) => redisGet(`plan:${e.toLowerCase()}`).catch(() => null))
    );
    for (const p of planChecks) {
      if (p === "basic")    basicCount++;
      else if (p === "pro") proCount++;
      else if (p === "business") businessCount++;
    }
  }

  const recentEmails = [...emails].reverse().slice(0, 10);
  const recentUsers = (
    await Promise.all(recentEmails.map((e: string) => redisGet(`user:${e}`).then((r) => r ? JSON.parse(r) : null)))
  ).filter(Boolean);

  const weekData = weekDates().map((date, i) => ({
    date,
    count: parseInt(weekCarousels[i] || "0"),
  }));

  return NextResponse.json({
    totalUsers: emails.length,
    onlineNow,
    activeToday,
    basicCount,
    proCount,
    businessCount,
    mrr: "—",
    carouselsToday: parseInt(carouselsTodayRaw || "0"),
    imagesToday:    parseInt(imagesTodayRaw    || "0"),
    weekData,
    recentUsers,
  });
}
