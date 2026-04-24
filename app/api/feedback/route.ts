import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redisLPush, redisLTrim, redisSet } from "@/lib/redis";
import { v4 as uuid } from "uuid";

export const maxDuration = 15;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { type, text, rating } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "Texto obrigatório" }, { status: 400 });
  if (!["feedback", "update_idea"].includes(type))
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });

  const id = uuid();
  const item = {
    id,
    type,
    text: text.trim(),
    rating: (rating && rating >= 1 && rating <= 5) ? rating : null,
    userEmail: email,
    userName: session.user?.name ?? "",
    createdAt: new Date().toISOString(),
    status: "pending",
    adminReply: null,
  };

  await redisSet(`feedback:${id}`, JSON.stringify(item));
  await redisLPush("feedbacks:list", id);
  await redisLTrim("feedbacks:list", 0, 499);

  return NextResponse.json({ ok: true });
}
