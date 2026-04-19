import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redisGet, redisSet } from "@/lib/redis";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALG = "aes-256-gcm";

function getKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET ?? "fallback-secret-32-chars-minimum!";
  return Buffer.from(secret.padEnd(32, "0").slice(0, 32));
}

function encrypt(text: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALG, getKey(), iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}.${enc.toString("hex")}.${tag.toString("hex")}`;
}

function decrypt(token: string): string {
  const [ivHex, encHex, tagHex] = token.split(".");
  if (!ivHex || !encHex || !tagHex) throw new Error("Token inválido");
  const decipher = createDecipheriv(ALG, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return decipher.update(Buffer.from(encHex, "hex")).toString("utf8") + decipher.final("utf8");
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const raw = await redisGet(`instagram:creds:${email}`).catch(() => null);
  if (!raw) return NextResponse.json({ connected: false });

  try {
    const { username, encPassword } = JSON.parse(raw);
    const password = decrypt(encPassword);
    return NextResponse.json({ connected: true, username, password });
  } catch {
    return NextResponse.json({ connected: false });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { username, password } = await req.json();
  if (!username?.trim() || !password?.trim()) {
    return NextResponse.json({ error: "Usuário e senha obrigatórios" }, { status: 400 });
  }

  const encPassword = encrypt(password.trim());
  await redisSet(`instagram:creds:${email}`, JSON.stringify({
    username: username.trim().replace(/^@/, ""),
    encPassword,
    savedAt: new Date().toISOString(),
  }));

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  await redisSet(`instagram:creds:${email}`, "");
  return NextResponse.json({ ok: true });
}
