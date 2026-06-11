import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redisGet, redisSet, redisDel } from "@/lib/redis";
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

function redisKey(email: string) { return `ig:account:${email}`; }

// GET — retorna conta Instagram salva
export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ connected: false });

  const raw = await redisGet(redisKey(email)).catch(() => null);
  if (!raw) return NextResponse.json({ connected: false });

  try {
    const { username, picture, accountId, encToken } = JSON.parse(raw);
    const token = decrypt(encToken);
    return NextResponse.json({ connected: true, token, accountId, username, picture });
  } catch {
    return NextResponse.json({ connected: false });
  }
}

// POST — salva conta Instagram (token criptografado)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { token, accountId, username, picture } = await req.json();
  if (!token || !accountId) return NextResponse.json({ error: "token e accountId obrigatórios" }, { status: 400 });

  const encToken = encrypt(token);
  await redisSet(redisKey(email), JSON.stringify({ username, picture, accountId, encToken, savedAt: new Date().toISOString() }));

  return NextResponse.json({ ok: true });
}

// DELETE — desconecta conta Instagram
export async function DELETE() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  await redisDel(redisKey(email)).catch(() => {});
  return NextResponse.json({ ok: true });
}
