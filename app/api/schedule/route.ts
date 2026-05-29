import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redisSet, redisGet, redisListAdd, redisListAll, redisLRem } from "@/lib/redis";

export const maxDuration = 60;

const GRAPH = "https://graph.facebook.com/v21.0";
const PENDING_KEY = "schedule:pending";

async function waitUntilReady(mediaId: string, token: string, maxMs = 60000): Promise<void> {
  const deadline = Date.now() + maxMs;
  let attempt = 0;
  while (Date.now() < deadline) {
    const res = await fetch(`${GRAPH}/${mediaId}?fields=status_code&access_token=${token}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message ?? "Erro no container");
    const s = data.status_code ?? "";
    if (s === "FINISHED") return;
    if (s === "ERROR")    throw new Error(`Container ${mediaId} falhou`);
    if (s === "EXPIRED")  throw new Error(`Container ${mediaId} expirou`);
    await new Promise((r) => setTimeout(r, attempt < 10 ? 3000 : 5000));
    attempt++;
  }
  throw new Error("Instagram demorou demais. Tente reagendar.");
}

async function publishNow(post: { igAccountId: string; igToken: string; imageUrls: string[]; caption: string; mediaType: string }): Promise<string> {
  const { igAccountId, igToken, imageUrls, caption, mediaType } = post;

  if (mediaType === "story") {
    const r = await fetch(`${GRAPH}/${igAccountId}/media`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image_url: imageUrls[0], media_type: "STORIES", access_token: igToken }) });
    const d = await r.json(); if (!d.id) throw new Error(d.error?.message ?? "Erro ao criar story");
    await waitUntilReady(d.id, igToken);
    const p = await fetch(`${GRAPH}/${igAccountId}/media_publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ creation_id: d.id, access_token: igToken }) });
    const pd = await p.json(); if (!pd.id) throw new Error(pd.error?.message ?? "Erro ao publicar story");
    return pd.id;
  }
  if (imageUrls.length === 1) {
    const r = await fetch(`${GRAPH}/${igAccountId}/media`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image_url: imageUrls[0], caption, access_token: igToken }) });
    const d = await r.json(); if (!d.id) throw new Error(d.error?.message ?? "Erro ao criar post");
    await waitUntilReady(d.id, igToken);
    const p = await fetch(`${GRAPH}/${igAccountId}/media_publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ creation_id: d.id, access_token: igToken }) });
    const pd = await p.json(); if (!pd.id) throw new Error(pd.error?.message ?? "Erro ao publicar");
    return pd.id;
  }
  const childIds: string[] = [];
  for (const url of imageUrls) {
    const r = await fetch(`${GRAPH}/${igAccountId}/media`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image_url: url, is_carousel_item: true, access_token: igToken }) });
    const d = await r.json(); if (!d.id) throw new Error(d.error?.message ?? "Erro ao criar item"); childIds.push(d.id);
  }
  await Promise.all(childIds.map((id) => waitUntilReady(id, igToken)));
  const r = await fetch(`${GRAPH}/${igAccountId}/media`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ media_type: "CAROUSEL", children: childIds.join(","), caption, access_token: igToken }) });
  const d = await r.json(); if (!d.id) throw new Error(d.error?.message ?? "Erro ao criar carrossel");
  await waitUntilReady(d.id, igToken);
  const p = await fetch(`${GRAPH}/${igAccountId}/media_publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ creation_id: d.id, access_token: igToken }) });
  const pd = await p.json(); if (!pd.id) throw new Error(pd.error?.message ?? "Erro ao publicar carrossel");
  return pd.id;
}

interface ScheduledPost {
  id: string;
  userId: string;
  caption: string;
  imageUrls: string[];
  scheduledAt: string;
  igAccountId: string;
  igToken: string;
  status: "scheduled" | "published" | "failed";
  mediaType: "carousel" | "story";
  createdAt: string;
  errorMsg?: string;
  igPostId?: string;
}

function postKey(id: string)        { return `schedule:post:${id}`; }
function userPostsKey(email: string) { return `schedule:user:${email}`; }

// GET — lista posts agendados do usuário
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const ids = await redisListAll(userPostsKey(session.user.email));
  const posts: ScheduledPost[] = [];

  for (const id of ids.slice(-50).reverse()) {
    const raw = await redisGet(postKey(id));
    if (raw) {
      try {
        const p = JSON.parse(raw) as ScheduledPost;
        posts.push({ ...p, igToken: "" }); // nunca expor o token
      } catch {}
    }
  }

  return NextResponse.json({ posts });
}

// POST — cria agendamento (salva no Redis, publica pelo cron)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { caption, imageUrls, scheduledAt, igAccountId, igToken, mediaType } = await req.json();

  if (!imageUrls?.length || !scheduledAt || !igAccountId || !igToken) {
    return NextResponse.json(
      { error: "Campos obrigatórios: imageUrls, scheduledAt, igAccountId, igToken" },
      { status: 400 }
    );
  }

  const scheduledDate = new Date(scheduledAt);
  const now = new Date();
  const minTime = new Date(now.getTime() + 5 * 60 * 1000);
  const maxTime = new Date(now.getTime() + 75 * 24 * 60 * 60 * 1000);

  if (scheduledDate < minTime)
    return NextResponse.json({ error: "Agendamento deve ser pelo menos 5 minutos no futuro" }, { status: 400 });
  if (scheduledDate > maxTime)
    return NextResponse.json({ error: "Agendamento máximo: 75 dias no futuro" }, { status: 400 });

  const isStory = mediaType === "story";
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const post: ScheduledPost = {
    id,
    userId: session.user.email,
    caption,
    imageUrls: isStory ? [imageUrls[0]] : imageUrls,
    scheduledAt,
    igAccountId,
    igToken, // necessário para o cron publicar
    status: "scheduled",
    mediaType: isStory ? "story" : "carousel",
    createdAt: new Date().toISOString(),
  };

  await redisSet(postKey(id), JSON.stringify(post));
  await redisListAdd(userPostsKey(session.user.email), id);
  await redisListAdd(PENDING_KEY, id);

  return NextResponse.json({ ok: true, id });
}

// DELETE — cancela agendamento
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  const raw = await redisGet(postKey(id));
  if (raw) {
    try {
      const post: ScheduledPost = JSON.parse(raw);
      if (post.userId !== session.user.email)
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
      post.status = "failed";
      post.errorMsg = "Cancelado pelo usuário";
      await redisSet(postKey(id), JSON.stringify(post));
    } catch {}
  }

  await redisLRem(userPostsKey(session.user.email), 0, id);

  return NextResponse.json({ ok: true });
}

// PATCH — cron job: publica posts vencidos (chamado pelo cron-job.org a cada minuto)
export async function PATCH(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const allPending = await redisListAll(PENDING_KEY);
  const dueIds = allPending.filter(Boolean);

  if (!dueIds.length) return NextResponse.json({ ok: true, processed: 0 });

  let published = 0, failed = 0, skipped = 0;

  for (const id of dueIds) {
    const raw = await redisGet(postKey(id));
    if (!raw) { await redisLRem(PENDING_KEY, 0, id); continue; }

    let post: ScheduledPost;
    try { post = JSON.parse(raw); } catch { continue; }

    // Ainda não chegou o horário
    if (new Date(post.scheduledAt).getTime() > now) { skipped++; continue; }

    // Já foi processado
    if (post.status !== "scheduled") { await redisLRem(PENDING_KEY, 0, id); continue; }

    // Remove da fila antes de tentar publicar (evita dupla execução)
    await redisLRem(PENDING_KEY, 0, id);

    try {
      const igPostId = await publishNow(post);
      post.status = "published";
      post.igPostId = igPostId;
      published++;
    } catch (err: any) {
      post.status = "failed";
      post.errorMsg = err.message;
      failed++;
      console.error(`[cron] ✗ ${id}:`, err.message);
    }
    await redisSet(postKey(id), JSON.stringify(post));
  }

  return NextResponse.json({ ok: true, processed: dueIds.length - skipped, published, failed, skipped, total: dueIds.length });
}
