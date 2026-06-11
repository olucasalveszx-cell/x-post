import { NextResponse } from "next/server";
import { redisGet, redisListAll } from "@/lib/redis";
import { PENDING_KEY, postKey, userPostsKey, ScheduledPost } from "@/lib/schedule-publish";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const maxDuration = 30;

// GET — diagnóstico rápido (sem publicar nada)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const now = new Date();
    const cronLastRun = await redisGet("cron:lastRun").catch(() => null);
    const pendingIds  = await redisListAll(PENDING_KEY).catch(() => [] as string[]);
    const userIds     = await redisListAll(userPostsKey(session.user.email)).catch(() => [] as string[]);

    const posts: any[] = [];
    for (const id of [...new Set([...pendingIds, ...userIds])].slice(0, 10)) {
      const raw = await redisGet(postKey(id)).catch(() => null);
      if (!raw) continue;
      try {
        const p: ScheduledPost = JSON.parse(raw);
        const scheduledDate = new Date(p.scheduledAt);
        posts.push({
          id: p.id, status: p.status, mediaType: p.mediaType,
          scheduledAt: p.scheduledAt,
          scheduledLocal: scheduledDate.toLocaleString("pt-BR"),
          overdue: scheduledDate < now,
          imageCount: p.imageUrls?.length ?? 0,
          hasToken: !!p.igToken, hasAccount: !!p.igAccountId,
          errorMsg: p.errorMsg ?? null,
        });
      } catch {}
    }

    return NextResponse.json({
      redis: "ok", now: now.toISOString(), cronLastRun,
      pendingGlobal: pendingIds.length, userPostCount: userIds.length, posts,
    });
  } catch (err: any) {
    return NextResponse.json({ redis: "ERRO: " + err.message, posts: [], cronLastRun: null });
  }
}

// POST — lança publicação e retorna estado atual (não espera o Instagram terminar)
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const now = Date.now();
    const userIds = await redisListAll(userPostsKey(session.user.email)).catch(() => [] as string[]);
    const pendingIds = await redisListAll(PENDING_KEY).catch(() => [] as string[]);
    const allIds = [...new Set([...pendingIds, ...userIds])];

    let scheduled = 0, overdue = 0, failed = 0, published = 0;
    const errors: string[] = [];

    for (const id of allIds) {
      const raw = await redisGet(postKey(id)).catch(() => null);
      if (!raw) continue;
      try {
        const p: ScheduledPost = JSON.parse(raw);
        if (p.status === "published") { published++; continue; }
        if (p.status === "failed") { failed++; if (p.errorMsg) errors.push(p.errorMsg); continue; }
        if (p.status === "scheduled") {
          if (new Date(p.scheduledAt).getTime() > now) { scheduled++; }
          else { overdue++; }
        }
      } catch {}
    }

    // Se há posts vencidos, dispara o cron em background (sem await)
    if (overdue > 0) {
      const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://xpostzone.online";
      fetch(`${base}/api/cron`, { method: "GET" }).catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      published, failed, scheduled, overdue,
      total: allIds.length,
      errors: errors.slice(0, 3),
      message: overdue > 0 ? `${overdue} post(s) vencido(s) — publicação iniciada em background` : "Nenhum post vencido para publicar",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
