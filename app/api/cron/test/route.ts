import { NextResponse } from "next/server";
import { redisGet, redisListAll, redisSet } from "@/lib/redis";
import { PENDING_KEY, postKey, userPostsKey, ScheduledPost } from "@/lib/schedule-publish";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const maxDuration = 120;

const GRAPH = "https://graph.facebook.com/v21.0";

async function igPost(url: string, body: object, token: string): Promise<any> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, access_token: token }),
  });
  const d = await res.json();
  if (d.error) throw new Error(d.error.message ?? JSON.stringify(d.error));
  return d;
}

async function waitReady(id: string, token: string): Promise<void> {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const res = await fetch(`${GRAPH}/${id}?fields=status_code&access_token=${token}`);
    const d = await res.json();
    if (d.error) throw new Error(d.error.message ?? "Erro no container");
    if (d.status_code === "FINISHED") return;
    if (d.status_code === "ERROR") throw new Error("Container falhou");
    if (d.status_code === "EXPIRED") throw new Error("Container expirou");
    await new Promise(r => setTimeout(r, 2000));
  }
}

async function publishPost(post: ScheduledPost): Promise<string> {
  const { igAccountId, igToken, imageUrls, caption, mediaType } = post;
  if (mediaType === "story") {
    const c = await igPost(`${GRAPH}/${igAccountId}/media`, { image_url: imageUrls[0], media_type: "STORIES" }, igToken);
    await waitReady(c.id, igToken);
    const p = await igPost(`${GRAPH}/${igAccountId}/media_publish`, { creation_id: c.id }, igToken);
    return p.id;
  }
  if (imageUrls.length === 1) {
    const c = await igPost(`${GRAPH}/${igAccountId}/media`, { image_url: imageUrls[0], caption }, igToken);
    await waitReady(c.id, igToken);
    const p = await igPost(`${GRAPH}/${igAccountId}/media_publish`, { creation_id: c.id }, igToken);
    return p.id;
  }
  const childIds = await Promise.all(
    imageUrls.map(url =>
      igPost(`${GRAPH}/${igAccountId}/media`, { image_url: url, is_carousel_item: true }, igToken).then(d => d.id)
    )
  );
  await Promise.all(childIds.map(id => waitReady(id, igToken)));
  const carousel = await igPost(`${GRAPH}/${igAccountId}/media`, { media_type: "CAROUSEL", children: childIds.join(","), caption }, igToken);
  await waitReady(carousel.id, igToken);
  const p = await igPost(`${GRAPH}/${igAccountId}/media_publish`, { creation_id: carousel.id }, igToken);
  return p.id;
}

// GET — diagnóstico detalhado
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const now = new Date();
  const diag: any = { now: now.toISOString(), redis: "ok", posts: [] };

  try {
    const pendingIds = await redisListAll(PENDING_KEY);
    const userIds    = await redisListAll(userPostsKey(session.user.email));
    const allIds     = [...new Set([...pendingIds, ...userIds].filter(Boolean))];

    diag.pendingCount  = pendingIds.length;
    diag.userPostCount = userIds.length;
    diag.totalIds      = allIds.length;

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
          firstImageUrl: p.imageUrls?.[0]?.slice(0, 60) ?? null,
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

// POST — tenta publicar posts vencidos do usuário agora, com detalhes de erro
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const now = Date.now();
  const userIds = await redisListAll(userPostsKey(session.user.email));
  const results: any[] = [];

  for (const id of userIds) {
    const raw = await redisGet(postKey(id));
    if (!raw) continue;
    let post: ScheduledPost;
    try { post = JSON.parse(raw); } catch { continue; }

    if (post.status !== "scheduled") continue;
    const isOverdue = new Date(post.scheduledAt).getTime() <= now;

    if (!isOverdue) {
      results.push({ id, status: "aguardando", scheduledAt: post.scheduledAt });
      continue;
    }

    try {
      const igPostId = await publishPost(post);
      post.status = "published"; post.igPostId = igPostId;
      await redisSet(postKey(id), JSON.stringify(post));
      results.push({ id, status: "published", igPostId });
    } catch (err: any) {
      post.status = "failed"; post.errorMsg = err.message;
      await redisSet(postKey(id), JSON.stringify(post));
      results.push({ id, status: "failed", error: err.message });
    }
  }

  return NextResponse.json({ ok: true, results });
}
