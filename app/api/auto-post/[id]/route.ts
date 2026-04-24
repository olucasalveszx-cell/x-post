import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAutoPost, updateAutoPostStatus } from "@/lib/auto-post";
import { AutoPostStatus } from "@/types";

// GET — retorna um auto-post pelo ID
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const item = await getAutoPost(params.id);
  if (!item) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json({ item });
}

// PATCH — atualiza status (cancelled, etc.)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const item = await getAutoPost(params.id);
  if (!item) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  if (item.userId !== session.user.email)
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { status } = (await req.json()) as { status: AutoPostStatus };
  const allowed: AutoPostStatus[] = ["cancelled"];
  if (!allowed.includes(status))
    return NextResponse.json({ error: `Status inválido: ${status}` }, { status: 400 });

  const updated = await updateAutoPostStatus(params.id, status);
  return NextResponse.json({ item: updated });
}
