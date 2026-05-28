import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redisSet, redisGet, redisListAdd, redisListAll, redisLRem, redisZAdd } from "@/lib/redis";

export const maxDuration = 30;

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
const QUEUE_KEY = "schedule:queue";

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
  const minTime = new Date(now.getTime() + 10 * 60 * 1000);
  const maxTime = new Date(now.getTime() + 75 * 24 * 60 * 60 * 1000);

  if (scheduledDate < minTime)
    return NextResponse.json({ error: "Agendamento deve ser pelo menos 10 minutos no futuro" }, { status: 400 });
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
  // Adiciona na fila ordenada por horário (score = Unix timestamp em ms)
  await redisZAdd(QUEUE_KEY, scheduledDate.getTime(), id);

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
