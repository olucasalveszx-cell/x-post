import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/adminAuth";
import { redisListAll, redisGet, redisZCount, redisSCard } from "@/lib/redis";
import { stripe } from "@/lib/stripe";

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
    stripeSubs,
  ] = await Promise.all([
    redisListAll("users:list"),
    redisZCount("xpz:presence", now - 120_000, now),      // online nos últimos 2min
    redisSCard(`xpz:active:${t}`),                         // ativos hoje
    redisGet(`stats:carousels:${t}`),
    redisGet(`stats:images:${t}`),
    Promise.all(weekDates().map((d) => redisGet(`stats:carousels:${d}`))),
    stripe.subscriptions.list({ status: "active", limit: 100, expand: ["data.plan"] }).catch(() => ({ data: [] })),
  ]);

  const totalUsers = emails.length;
  const proCount   = stripeSubs.data.length;

  // MRR estimado — soma dos planos ativos
  let mrr = 0;
  for (const sub of stripeSubs.data) {
    const item = (sub as any).items?.data?.[0];
    if (item?.price?.unit_amount) mrr += item.price.unit_amount / 100;
  }

  // Últimos 10 usuários
  const recentEmails = [...emails].reverse().slice(0, 10);
  const recentUsers = (
    await Promise.all(recentEmails.map((e) => redisGet(`user:${e}`).then((r) => r ? JSON.parse(r) : null)))
  ).filter(Boolean);

  // Carrosséis por dia (semana)
  const weekData = weekDates().map((date, i) => ({
    date,
    count: parseInt(weekCarousels[i] || "0"),
  }));

  return NextResponse.json({
    totalUsers,
    onlineNow,
    activeToday,
    proCount,
    mrr: mrr.toFixed(2),
    carouselsToday: parseInt(carouselsTodayRaw || "0"),
    imagesToday:    parseInt(imagesTodayRaw    || "0"),
    weekData,
    recentUsers,
  });
}
