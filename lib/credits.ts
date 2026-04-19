import { getEmailPlan, isEmailActive } from "./kv";

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

/* ── Custo por ação ── */
export const ACTION_COST: Record<string, number> = {
  carousel:    1,
  carousel_ai: 2,
  flyer:       2,
  promo:       1,
  translate:   1,
};

/* ── Chave Redis para o mês atual ── */
function monthKey(email: string): string {
  const now = new Date();
  return `credits:${email.toLowerCase()}:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/* ── Busca plano do usuário ── */
export async function getUserPlan(email: string): Promise<string> {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  if (adminEmail && email.toLowerCase().trim() === adminEmail) return "business";

  // Cache de 1h para evitar múltiplas consultas ao Redis
  const cacheKey = `plan_cache:${email.toLowerCase()}`;
  const cached = await redis(["get", cacheKey]);
  if (cached.result && ["basic", "pro", "business"].includes(cached.result as string)) {
    return cached.result as string;
  }

  // Busca plano salvo pelo webhook do Kirvano
  const plan = await getEmailPlan(email).catch(() => null);
  if (plan && ["basic", "pro", "business"].includes(plan)) {
    await redis(["set", cacheKey, plan, "ex", "3600"]);
    return plan;
  }

  // Fallback: verifica ativação genérica (Pro)
  const active = await isEmailActive(email).catch(() => false);
  if (active) {
    await redis(["set", cacheKey, "pro", "ex", "3600"]);
    return "pro";
  }

  return "free";
}

/* ── Bônus: créditos extras ── */
function bonusKey(email: string) { return `credits:bonus:${email.toLowerCase()}`; }

export async function getBonusCredits(email: string): Promise<number> {
  const data = await redis(["get", bonusKey(email)]);
  return parseInt((data.result as string) ?? "0") || 0;
}

export async function addBonusCredits(email: string, amount: number): Promise<void> {
  await redis(["incrby", bonusKey(email), String(amount)]);
}

/* ── Info completa de créditos ── */
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
  const limit = PLAN_LIMITS[plan] ?? 3;

  const key  = monthKey(email);
  const [monthData, bonus] = await Promise.all([
    redis(["get", key]),
    getBonusCredits(email),
  ]);
  const used = parseInt((monthData.result as string) ?? "0") || 0;
  const remaining = Math.max(0, limit - used);

  return { plan, used, limit, remaining, unlimited: false, bonus, total: remaining + bonus };
}

/* ── Consome créditos ── */
export async function consumeCredits(
  email: string,
  action: keyof typeof ACTION_COST = "carousel"
): Promise<{ ok: boolean; remaining: number; unlimited: boolean; plan: string }> {
  const plan  = await getUserPlan(email);
  const limit = PLAN_LIMITS[plan] ?? 3;
  const cost  = ACTION_COST[action] ?? 1;

  const key  = monthKey(email);
  const [monthData, bonus] = await Promise.all([
    redis(["get", key]),
    getBonusCredits(email),
  ]);
  const used = parseInt((monthData.result as string) ?? "0") || 0;
  const monthlyRemaining = Math.max(0, limit - used);

  if (monthlyRemaining >= cost) {
    await redis(["incrby", key, String(cost)]);
    await redis(["expire", key, String(35 * 24 * 60 * 60)]);
    return { ok: true, remaining: monthlyRemaining - cost + bonus, unlimited: false, plan };
  }

  if (bonus >= cost) {
    await redis(["incrby", bonusKey(email), String(-cost)]);
    return { ok: true, remaining: bonus - cost, unlimited: false, plan };
  }

  return { ok: false, remaining: monthlyRemaining + bonus, unlimited: false, plan };
}
