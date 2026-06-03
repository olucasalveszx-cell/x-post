import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redisSet, redisGet, redisListAdd, redisListAll, redisLRem } from "@/lib/redis";
import { processPendingPosts, postKey, userPostsKey, PENDING_KEY, ScheduledPost } from "@/lib/schedule-publish";

export const maxDuration = 300;

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
  if (scheduledDate < new Date(now.getTime() + 5 * 60 * 1000))
    return NextResponse.json({ error: "Agendamento deve ser pelo menos 5 minutos no futuro" }, { status: 400 });
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

// PATCH — trigger manual (mesmo do cron)
export async function PATCH(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processPendingPosts();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
