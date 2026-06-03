import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redisSet, redisGet, redisListAdd, redisListAll, redisLRem, redisSetNX } from "@/lib/redis";

export const maxDuration = 300;

const GRAPH = "https://graph.facebook.com/v21.0";
const PENDING_KEY = "schedule:pending";

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
  retries?: number;
}

function postKey(id: string)         { return `schedule:post:${id}`; }
function userPostsKey(email: string) { return `schedule:user:${email}`; }

// Publica sem polling longo — cabe no timeout de 10s do Netlify
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

// Aguarda container ficar pronto — máx 25s (Vercel Pro tem 300s)
async function waitReady(id: string, token: string): Promise<void> {
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    const res = await fetch(`${GRAPH}/${id}?fields=status_code&access_token=${token}`);
    const d = await res.json();
    if (d.error) throw new Error(d.error.message ?? "Erro no container");
    if (d.status_code === "FINISHED") return;
    if (d.status_code === "ERROR")    throw new Error("Container falhou no processamento");
    if (d.status_code === "EXPIRED")  throw new Error("Container expirou");
    await new Promise(r => setTimeout(r, 1500));
  }
  // Não lança erro — tenta publicar mesmo assim (muitas vezes funciona)
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

  // Carrossel — cria items em paralelo
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

// GET — lista posts agendados do usuário
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const ids = await redisListAll(userPostsKey(session.user.email));
  const posts: ScheduledPost[] = [];
  for (const id of ids.slice(-200).reverse()) {
    const raw = await redisGet(postKey(id));
    if (raw) {
      try { posts.push({ ...JSON.parse(raw), igToken: "" }); } catch {}
    }
  }
  return NextResponse.json({ posts });
}

// POST — cria agendamento
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { caption, imageUrls, scheduledAt, igAccountId, igToken, mediaType } = await req.json();
  if (!imageUrls?.length || !scheduledAt || !igAccountId || !igToken)
    return NextResponse.json({ error: "Campos obrigatórios: imageUrls, scheduledAt, igAccountId, igToken" }, { status: 400 });

  const scheduledDate = new Date(scheduledAt);
  const now = new Date();
  if (scheduledDate < new Date(now.getTime() + 8 * 60 * 1000))
    return NextResponse.json({ error: "Agendamento deve ser pelo menos 8 minutos no futuro" }, { status: 400 });
  if (scheduledDate > new Date(now.getTime() + 75 * 24 * 60 * 60 * 1000))
    return NextResponse.json({ error: "Agendamento máximo: 75 dias no futuro" }, { status: 400 });

  const isStory = mediaType === "story";
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const post: ScheduledPost = {
    id, userId: session.user.email, caption,
    imageUrls: isStory ? [imageUrls[0]] : imageUrls,
    scheduledAt, igAccountId, igToken,
    status: "scheduled",
    mediaType: isStory ? "story" : "carousel",
    createdAt: new Date().toISOString(),
  };

  await redisSet(postKey(id), JSON.stringify(post));
  await redisListAdd(userPostsKey(session.user.email), id);
  await redisListAdd(PENDING_KEY, id);
  await redisListAdd("schedule:users", session.user.email);

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
      if (post.userId !== session.user.email) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
      post.status = "failed"; post.errorMsg = "Cancelado pelo usuário";
      await redisSet(postKey(id), JSON.stringify(post));
    } catch {}
  }
  await redisLRem(userPostsKey(session.user.email), 0, id);
  return NextResponse.json({ ok: true });
}

// PATCH — cron: publica posts vencidos
export async function PATCH(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = Date.now();

  // Coleta IDs de todas as fontes
  const pendingIds = await redisListAll(PENDING_KEY);
  const users = await redisListAll("schedule:users");
  const userPostIds: string[] = [];
  for (const email of [...new Set(users.filter(Boolean))]) {
    const ids = await redisListAll(userPostsKey(email));
    userPostIds.push(...ids);
  }
  const allIds = [...new Set([...pendingIds, ...userPostIds].filter(Boolean))];

  let published = 0, failed = 0, skipped = 0;

  for (const id of allIds) {
    const raw = await redisGet(postKey(id));
    if (!raw) { await redisLRem(PENDING_KEY, 0, id); continue; }
    let post: ScheduledPost;
    try { post = JSON.parse(raw); } catch { continue; }

    if (post.status !== "scheduled") { await redisLRem(PENDING_KEY, 0, id); continue; }
    if (new Date(post.scheduledAt).getTime() > now) { skipped++; continue; }

    // Lock distribuído: evita processamento duplo em chamadas sobrepostas
    const lock = await redisSetNX(`schedule:lock:${id}`, "1", 120);
    if (!lock) { skipped++; continue; }

    await redisLRem(PENDING_KEY, 0, id);
    try {
      const igPostId = await publishPost(post);
      post.status = "published"; post.igPostId = igPostId; published++;
    } catch (err: any) {
      post.status = "failed"; post.errorMsg = err.message; failed++;
    }
    await redisSet(postKey(id), JSON.stringify(post));
  }

  return NextResponse.json({ ok: true, published, failed, skipped, total: allIds.length });
}
