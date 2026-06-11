import { NextRequest, NextResponse } from "next/server";
import { redisGet, redisSet, redisListAdd } from "@/lib/redis";
import { hashPassword } from "@/lib/password";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { name, email, password } = body as Record<string, string>;

  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return NextResponse.json({ error: "Preencha todos os campos." }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "A senha precisa ter no mínimo 6 caracteres." }, { status: 400 });
  }

  const emailNorm = email.toLowerCase().trim();
  const key = `user:${emailNorm}`;

  const existing = await redisGet(key);
  if (existing) {
    return NextResponse.json({ error: "E-mail já cadastrado. Faça login." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = {
    name:         name.trim(),
    email:        emailNorm,
    passwordHash,
    createdAt:    new Date().toISOString(),
  };

  await redisSet(key, JSON.stringify(user));
  await redisListAdd("users:list", emailNorm);


  return NextResponse.json({ ok: true });
}
