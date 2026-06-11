import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/adminAuth";
import { redisGet, redisSet, redisListAll } from "@/lib/redis";
import { getCreditsInfo, addBonusCredits } from "@/lib/credits";

export const maxDuration = 30;

const REST_URL   = process.env.UPSTASH_REDIS_REST_URL!;
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

async function redisDel(...keys: string[]) {
  await fetch(`${REST_URL}/del/${keys.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${REST_TOKEN}` },
  });
}

async function redisSetDirect(key: string, value: string) {
  await fetch(`${REST_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}`, {
    headers: { Authorization: `Bearer ${REST_TOKEN}` },
  });
}

async function redisLRem(key: string, value: string) {
  await fetch(`${REST_URL}/lrem/${encodeURIComponent(key)}/0/${encodeURIComponent(value)}`, {
    headers: { Authorization: `Bearer ${REST_TOKEN}` },
  });
}

function monthKey(email: string) {
  const now = new Date();
  return `credits:${email.toLowerCase()}:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function isAdmin(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value ?? "";
  return verifyAdminToken(token);
}

/* GET — lista usuários com créditos */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const emails: string[] = await redisListAll("users:list");

  const users = await Promise.all(
    [...emails].reverse().map(async (email) => {
      const [raw, credits] = await Promise.all([
        redisGet(`user:${email}`),
        getCreditsInfo(email).catch(() => null),
      ]);
      if (!raw) return null;
      let u: any;
      try { u = JSON.parse(raw); } catch { return null; }
      return {
        name: u.name ?? "",
        email,
        createdAt: u.createdAt ?? "",
        plan: credits?.plan ?? "free",
        used: credits?.used ?? 0,
        limit: credits?.limit ?? 3,
        bonus: credits?.bonus ?? 0,
        total: credits?.total ?? 0,
      };
    })
  );

  return NextResponse.json({ users: users.filter(Boolean) });
}

/* POST — ações: add_credits | reset_credits | delete_user */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { action, email, amount } = await req.json();
  if (!email) return NextResponse.json({ error: "email obrigatório" }, { status: 400 });

  const emailNorm = email.toLowerCase().trim();

  if (action === "add_credits") {
    const n = parseInt(amount ?? "0");
    if (!n || n < 1) return NextResponse.json({ error: "amount inválido" }, { status: 400 });
    await addBonusCredits(emailNorm, n);
    return NextResponse.json({ ok: true });
  }

  if (action === "reset_credits") {
    const key = monthKey(emailNorm);
    await Promise.all([
      redisSetDirect(key, "0"),
      redisSetDirect(`credits:bonus:${emailNorm}`, "0"),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (action === "delete_user") {
    const now = new Date();
    const mKey = `credits:${emailNorm}:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    await Promise.all([
      redisLRem("users:list", emailNorm),
      redisDel(
        `user:${emailNorm}`,
        `plan:${emailNorm}`,
        `plan_cache:${emailNorm}`,
        mKey,
        `credits:bonus:${emailNorm}`,
        `instagram:creds:${emailNorm}`,
      ),
    ]);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "action inválida" }, { status: 400 });
}
