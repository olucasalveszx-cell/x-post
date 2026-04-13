import { stripe } from "./stripe";

const REST_URL   = process.env.UPSTASH_REDIS_REST_URL!;
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

async function redis(cmd: string[]) {
  const res = await fetch(`${REST_URL}/${cmd.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${REST_TOKEN}` },
  });
  return res.json();
}

/* ── Limites por plano ── */
export const PLAN_LIMITS: Record<string, number> = {
  basic:    30,
  pro:      80,
  business: -1, // -1 = ilimitado
  free:      5,
};

/* ── Custo por ação ── */
export const ACTION_COST: Record<string, number> = {
  carousel: 1,
  flyer:    2,
  promo:    1,
  translate: 1,
};

/* ── Detecta plano pelo price ID ── */
function planFromPriceId(priceId: string): string {
  if (priceId === process.env.STRIPE_PRICE_BASIC)    return "basic";
  if (priceId === process.env.STRIPE_PRICE_PRO)      return "pro";
  if (priceId === process.env.STRIPE_PRICE_BUSINESS) return "business";
  return "free";
}

/* ── Chave Redis para o mês atual ── */
function monthKey(email: string): string {
  const now = new Date();
  return `credits:${email.toLowerCase()}:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/* ── Busca plano do usuário (com cache 1h) ── */
export async function getUserPlan(email: string): Promise<string> {
  const cacheKey = `plan:${email.toLowerCase()}`;
  const cached = await redis(["get", cacheKey]);
  if (cached.result) return cached.result as string;

  try {
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (!customers.data.length) return "free";

    const subs = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      status: "active",
      limit: 1,
    });
    if (!subs.data.length) return "free";

    const priceId = subs.data[0].items.data[0].price.id;
    const plan = planFromPriceId(priceId);

    await redis(["set", cacheKey, plan, "ex", "3600"]);
    return plan;
  } catch {
    return "free";
  }
}

/* ── Retorna info de créditos do usuário ── */
export async function getCreditsInfo(email: string): Promise<{
  plan: string;
  used: number;
  limit: number;
  remaining: number;
  unlimited: boolean;
}> {
  const plan  = await getUserPlan(email);
  const limit = PLAN_LIMITS[plan] ?? 5;

  if (limit === -1) {
    return { plan, used: 0, limit: -1, remaining: -1, unlimited: true };
  }

  const key  = monthKey(email);
  const data = await redis(["get", key]);
  const used = parseInt((data.result as string) ?? "0") || 0;

  return {
    plan,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    unlimited: false,
  };
}

/* ── Consome créditos — retorna ok: false se não tiver saldo ── */
export async function consumeCredits(
  email: string,
  action: keyof typeof ACTION_COST = "carousel"
): Promise<{ ok: boolean; remaining: number; unlimited: boolean; plan: string }> {
  const plan  = await getUserPlan(email);
  const limit = PLAN_LIMITS[plan] ?? 5;
  const cost  = ACTION_COST[action] ?? 1;

  if (limit === -1) {
    return { ok: true, remaining: -1, unlimited: true, plan };
  }

  const key  = monthKey(email);
  const data = await redis(["get", key]);
  const used = parseInt((data.result as string) ?? "0") || 0;

  if (used + cost > limit) {
    return { ok: false, remaining: Math.max(0, limit - used), unlimited: false, plan };
  }

  await redis(["incrby", key, String(cost)]);
  await redis(["expire", key, String(35 * 24 * 60 * 60)]);

  return { ok: true, remaining: limit - used - cost, unlimited: false, plan };
}
