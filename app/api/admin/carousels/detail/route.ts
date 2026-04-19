import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/adminAuth";
import { redisGet } from "@/lib/redis";

export const maxDuration = 15;

export async function GET(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value ?? "";
  if (!verifyAdminToken(token)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  const id    = searchParams.get("id");
  if (!email || !id) return NextResponse.json({ error: "email e id obrigatórios" }, { status: 400 });

  const raw = await redisGet(`draft:${email}:${id}`);
  if (!raw) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  try {
    const slides = JSON.parse(raw);
    return NextResponse.json({ slides });
  } catch {
    return NextResponse.json({ error: "Dado corrompido" }, { status: 500 });
  }
}
