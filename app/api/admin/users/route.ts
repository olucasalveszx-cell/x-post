import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/adminAuth";
import { redisListAll, redisGet, redisSet, redisListAdd } from "@/lib/redis";
import { hashPassword } from "@/lib/password";

function auth(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value ?? "";
  return verifyAdminToken(token);
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const emails = (await redisListAll("users:list")) ?? [];

  const users = await Promise.all(
    emails.map(async (email) => {
      const raw = await redisGet(`user:${email}`);
      if (!raw) return null;
      const u = JSON.parse(raw);
      return { name: u.name, email: u.email, createdAt: u.createdAt };
    }),
  );

  const sorted = users
    .filter(Boolean)
    .sort((a, b) => new Date(b!.createdAt).getTime() - new Date(a!.createdAt).getTime());

  return NextResponse.json({ users: sorted });
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { name, email, password, plan = "free" } = body as Record<string, string>;

  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return NextResponse.json({ error: "Preencha nome, e-mail e senha." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Senha precisa ter no mínimo 6 caracteres." }, { status: 400 });
  }

  const emailNorm = email.toLowerCase().trim();
  const existing = await redisGet(`user:${emailNorm}`);
  if (existing) return NextResponse.json({ error: "E-mail já cadastrado." }, { status: 409 });

  const passwordHash = await hashPassword(password);
  const user = {
    name: name.trim(),
    email: emailNorm,
    passwordHash,
    plan: plan || "free",
    credits: 0,
    bonusCredits: 0,
    createdAt: new Date().toISOString(),
  };

  await redisSet(`user:${emailNorm}`, JSON.stringify(user));
  await redisListAdd("users:list", emailNorm);

  return NextResponse.json({ ok: true });
}
