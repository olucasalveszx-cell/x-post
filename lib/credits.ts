import { stripe } from "./stripe";

const REST_URL   = process.env.UPSTASH_REDIS_REST_URL!;
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

async function redis(cmd: string[]) {
  const res = await fetch(`${REST_URL}/${cmd.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${REST_TOKEN}` },
  });
  return res.json();
}

/* ── Limites mensais por plano ── */
export const PLAN_LIMITS: Record<string, number> = {
  basic:    30,
  pro:      45,
  business: 100,
  free:      3,
};

/* ── Pacotes de créditos extras ── */
export const CREDIT_PACKS = [
  { id: "10",  credits: 10,  label: "Starter" },
  { id: "25",  credits: 25,  label: "Plus"    },
  { id: "50",  credits: 50,  label: "Pro"     },
  { id: "100", credits: 100, label: "Max"     },
] as const;
export type CreditPackId = typeof CREDIT_PACKS[number]["id"];

/* ── Custo por ação ── */
export const ACTION_COST: Record<string, number> = {
  carousel:    1,  // foto real (Google)
  carousel_ai: 2,  // imagens geradas por IA
  flyer:       2,
  promo:       1,
  translate:   1,
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
  // Admin sempre tem plano business (ilimitado)
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  if (adminEmail && email.toLowerCase().trim() === adminEmail) return "business";

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

/* ── Bônus: créditos extras comprados ── */
function bonusKey(email: string) { return `credits:bonus:${email.toLowerCase()}`; }

export async function getBonusCredits(email: string): Promise<number> {
  const data = await redis(["get", bonusKey(email)]);
  return parseInt((data.result as string) ?? "0") || 0;
}

export async function addBonusCredits(email: string, amount: number): Promise<void> {
  await redis(["incrby", bonusKey(email), String(amount)]);
}

/* ── Retorna info de créditos do usuário ── */
export async function getCreditsInfo(email: string): Promise<{
  plan: string;
  used: number;
  limit: number;
  remaining: number;
  unlimited: boolean;
  bonus: number;
  total: number;
}> {
  const plan  = await getUserPlan(email);
  const limit = PLAN_LIMITS[plan] ?? 5;

  const key  = monthKey(email);
  const [monthData, bonus] = await Promise.all([
    redis(["get", key]),
    getBonusCredits(email),
  ]);
  const used = parseInt((monthData.result as string) ?? "0") || 0;
  const remaining = Math.max(0, limit - used);

  return {
    plan,
    used,
    limit,
    remaining,
    unlimited: false,
    bonus,
    total: remaining + bonus,
  };
}

/* ── Consome créditos — usa mensal primeiro, depois bônus ── */
export async function consumeCredits(
  email: string,
  action: keyof typeof ACTION_COST = "carousel"
): Promise<{ ok: boolean; remaining: number; unlimited: boolean; plan: string }> {
  const plan  = await getUserPlan(email);
  const limit = PLAN_LIMITS[plan] ?? 5;
  const cost  = ACTION_COST[action] ?? 1;

  const key  = monthKey(email);
  const [monthData, bonus] = await Promise.all([
    redis(["get", key]),
    getBonusCredits(email),
  ]);
  const used = parseInt((monthData.result as string) ?? "0") || 0;
  const monthlyRemaining = Math.max(0, limit - used);

  // Usa créditos mensais primeiro
  if (monthlyRemaining >= cost) {
    await redis(["incrby", key, String(cost)]);
    await redis(["expire", key, String(35 * 24 * 60 * 60)]);
    return { ok: true, remaining: monthlyRemaining - cost + bonus, unlimited: false, plan };
  }

  // Mensal esgotado — usa bônus
  if (bonus >= cost) {
    await redis(["incrby", bonusKey(email), String(-cost)]);
    return { ok: true, remaining: bonus - cost, unlimited: false, plan };
  }

  return { ok: false, remaining: monthlyRemaining + bonus, unlimited: false, plan };
}
