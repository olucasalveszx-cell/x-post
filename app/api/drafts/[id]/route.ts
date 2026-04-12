import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redisGet } from "@/lib/redis";

export const maxDuration = 15;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const raw = await redisGet(`draft:${session.user.email}:${params.id}`);
  if (!raw) return NextResponse.json({ error: "Rascunho não encontrado" }, { status: 404 });

  try {
    const slides = JSON.parse(raw);
    return NextResponse.json({ slides });
  } catch {
    return NextResponse.json({ error: "Rascunho corrompido" }, { status: 500 });
  }
}
