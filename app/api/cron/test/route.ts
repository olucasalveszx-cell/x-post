import { NextResponse } from "next/server";
import { redisGet, redisListAll } from "@/lib/redis";
import { PENDING_KEY, postKey, userPostsKey, processPendingPosts } from "@/lib/schedule-publish";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const maxDuration = 60;

// GET — diagnóstico: lista pendentes + tenta publicar
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const now = new Date();
  const diag: Record<string, any> = { now: now.toISOString(), redis: "ok", posts: [] };

  try {
    // Verifica Redis
    const pendingIds = await redisListAll(PENDING_KEY);
    const userIds    = await redisListAll(userPostsKey(session.user.email));
    const allIds     = [...new Set([...pendingIds, ...userIds].filter(Boolean))];

    diag.pendingCount = pendingIds.length;
    diag.userPostCount = userIds.length;

    for (const id of allIds.slice(0, 20)) {
      const raw = await redisGet(postKey(id));
      if (!raw) { diag.posts.push({ id, error: "não encontrado no Redis" }); continue; }
      try {
        const p = JSON.parse(raw);
        const scheduledDate = new Date(p.scheduledAt);
        diag.posts.push({
          id: p.id,
          status: p.status,
          mediaType: p.mediaType,
          scheduledAt: p.scheduledAt,
          scheduledLocal: scheduledDate.toLocaleString("pt-BR"),
          overdue: scheduledDate < now,
          imageCount: p.imageUrls?.length ?? 0,
          hasToken: !!p.igToken,
          hasAccount: !!p.igAccountId,
          errorMsg: p.errorMsg ?? null,
        });
      } catch { diag.posts.push({ id, error: "parse error" }); }
    }
  } catch (err: any) {
    diag.redis = "ERRO: " + err.message;
  }

  return NextResponse.json(diag);
}

// POST — dispara publicação manual agora
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const result = await processPendingPosts();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
