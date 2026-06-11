import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redisGet, redisSet, redisListAdd, redisListAll } from "@/lib/redis";

export const maxDuration = 15;

interface DraftMeta {
  id: string;
  name: string;
  slideCount: number;
  thumbnail?: string; // URL da primeira imagem
  createdAt: string;
  updatedAt: string;
}

function draftKey(email: string, id: string) { return `draft:${email}:${id}`; }
function draftListKey(email: string) { return `drafts:${email}`; }

// GET — lista rascunhos do usuário
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const email = session.user.email;

  const ids = await redisListAll(draftListKey(email));
  const metas: DraftMeta[] = [];

  for (const id of ids.slice(-20).reverse()) { // últimos 20, mais recentes primeiro
    const raw = await redisGet(`draftmeta:${email}:${id}`);
    if (raw) {
      try { metas.push(JSON.parse(raw)); } catch {}
    }
  }

  return NextResponse.json({ drafts: metas });
}

// POST — salva/atualiza rascunho
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const email = session.user.email;

  const { id, name, slides } = await req.json();
  if (!id || !slides) return NextResponse.json({ error: "id e slides obrigatórios" }, { status: 400 });

  const thumbnail = slides.find((s: any) => s.backgroundImageUrl)?.backgroundImageUrl ?? null;
  const now = new Date().toISOString();

  // Salva os slides completos
  await redisSet(draftKey(email, id), JSON.stringify(slides));

  // Salva os metadados separado (mais leve para listar)
  const meta: DraftMeta = {
    id,
    name: name ?? `Rascunho ${new Date().toLocaleDateString("pt-BR")}`,
    slideCount: slides.length,
    thumbnail,
    createdAt: now,
    updatedAt: now,
  };
  await redisSet(`draftmeta:${email}:${id}`, JSON.stringify(meta));
  await redisListAdd(draftListKey(email), id);

  return NextResponse.json({ ok: true, id });
}

// DELETE — remove rascunho
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const email = session.user.email;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  await redisSet(draftKey(email, id), ""); // limpa os dados
  await redisSet(`draftmeta:${email}:${id}`, "");
  // Remove da lista
  const { redisListAll: _, ...redis } = await import("@/lib/redis");
  // Remove o id da lista manualmente via LREM
  const BASE = process.env.UPSTASH_REDIS_REST_URL!;
  const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;
  await fetch(BASE, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(["LREM", draftListKey(email), "0", id]),
  });

  return NextResponse.json({ ok: true });
}
