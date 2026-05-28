import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redisSet, redisListAdd, redisListAll, redisGet } from "@/lib/redis";

export const maxDuration = 120;

const GRAPH = "https://graph.facebook.com/v21.0";

async function waitUntilReady(mediaId: string, token: string, maxWaitMs = 45000): Promise<void> {
  const deadline = Date.now() + maxWaitMs;
  let attempt = 0;
  while (Date.now() < deadline) {
    const res = await fetch(`${GRAPH}/${mediaId}?fields=status_code&access_token=${token}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message ?? "Erro ao verificar status do container");
    const status: string = data.status_code ?? "";
    if (status === "FINISHED") return;
    if (status === "ERROR")   throw new Error(`Container ${mediaId} falhou no processamento`);
    if (status === "EXPIRED") throw new Error(`Container ${mediaId} expirou — URL da imagem pode estar inacessível`);
    await new Promise((r) => setTimeout(r, attempt < 10 ? 3000 : 5000));
    attempt++;
  }
  throw new Error("Instagram demorou demais para processar a mídia. Tente novamente.");
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
  createdAt: string;
  errorMsg?: string;
  igMediaId?: string;
  mediaType?: "carousel" | "story";
}

function postKey(id: string) { return `schedule:post:${id}`; }
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
      try { posts.push(JSON.parse(raw)); } catch {}
    }
  }

  return NextResponse.json({ posts });
}

// POST — cria agendamento
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { caption, imageUrls, scheduledAt, igAccountId, igToken, mediaType } = await req.json();

  if (!imageUrls?.length || !scheduledAt || !igAccountId || !igToken) {
    return NextResponse.json({ error: "Campos obrigatórios: imageUrls, scheduledAt, igAccountId, igToken" }, { status: 400 });
  }

  const isStory = mediaType === "story";

  const scheduledDate = new Date(scheduledAt);
  const now = new Date();
  const minTime = new Date(now.getTime() + 10 * 60 * 1000); // mínimo 10 min no futuro
  const maxTime = new Date(now.getTime() + 75 * 24 * 60 * 60 * 1000); // máximo 75 dias

  if (scheduledDate < minTime) {
    return NextResponse.json({ error: "Agendamento deve ser pelo menos 10 minutos no futuro" }, { status: 400 });
  }
  if (scheduledDate > maxTime) {
    return NextResponse.json({ error: "Agendamento máximo: 75 dias no futuro" }, { status: 400 });
  }

  const scheduledUnix = Math.floor(scheduledDate.getTime() / 1000);

  // Cria containers de imagem no Instagram
  let containerIds: string[] = [];
  let carouselContainerId: string | null = null;

  try {
    if (isStory) {
      // Story: apenas 1 imagem, media_type STORIES
      const r = await fetch(`${GRAPH}/${igAccountId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: imageUrls[0],
          media_type: "STORIES",
          published: false,
          scheduled_publish_time: scheduledUnix,
          access_token: igToken,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error?.message ?? "Erro ao criar container do story");
      carouselContainerId = d.id;
      await waitUntilReady(carouselContainerId, igToken);
    } else if (imageUrls.length === 1) {
      // Post simples
      const r = await fetch(`${GRAPH}/${igAccountId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: imageUrls[0],
          caption,
          published: false,
          scheduled_publish_time: scheduledUnix,
          access_token: igToken,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error?.message ?? "Erro ao criar container");
      carouselContainerId = d.id;
      await waitUntilReady(carouselContainerId, igToken);
    } else {
      // Carrossel: cria um container por imagem
      for (const url of imageUrls) {
        const r = await fetch(`${GRAPH}/${igAccountId}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_url: url,
            is_carousel_item: true,
            access_token: igToken,
          }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error?.message ?? "Erro ao criar item do carrossel");
        containerIds.push(d.id);
      }

      // Aguarda todos os items estarem prontos antes de criar o carrossel
      await Promise.all(containerIds.map((id) => waitUntilReady(id, igToken)));

      // Container do carrossel
      const r = await fetch(`${GRAPH}/${igAccountId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: "CAROUSEL",
          children: containerIds.join(","),
          caption,
          published: false,
          scheduled_publish_time: scheduledUnix,
          access_token: igToken,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error?.message ?? "Erro ao criar container do carrossel");
      carouselContainerId = d.id;
      await waitUntilReady(carouselContainerId, igToken);
    }

    // Publica (com agendamento)
    const pubRes = await fetch(`${GRAPH}/${igAccountId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: carouselContainerId,
        access_token: igToken,
      }),
    });
    const pubData = await pubRes.json();
    if (!pubRes.ok) throw new Error(pubData.error?.message ?? "Erro ao publicar");

    // Salva no Redis
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const post: ScheduledPost = {
      id,
      userId: session.user.email,
      caption,
      imageUrls: isStory ? [imageUrls[0]] : imageUrls,
      scheduledAt,
      igAccountId,
      igToken: "",
      status: "scheduled",
      createdAt: new Date().toISOString(),
      igMediaId: pubData.id,
      mediaType: isStory ? "story" : "carousel",
    };

    await redisSet(postKey(id), JSON.stringify(post));
    await redisListAdd(userPostsKey(session.user.email), id);

    return NextResponse.json({ ok: true, id, igMediaId: pubData.id });
  } catch (err: any) {
    console.error("[schedule]", err);
    return NextResponse.json({ error: err.message ?? "Erro ao agendar" }, { status: 500 });
  }
}

// DELETE — cancela agendamento
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id, igMediaId, igToken, igAccountId } = await req.json();

  // Tenta deletar no Instagram
  if (igMediaId && igToken) {
    try {
      await fetch(`https://graph.facebook.com/v21.0/${igMediaId}?access_token=${igToken}`, {
        method: "DELETE",
      });
    } catch {}
  }

  // Remove do Redis
  const raw = await redisGet(postKey(id));
  if (raw) {
    try {
      const post: ScheduledPost = JSON.parse(raw);
      post.status = "failed";
      post.errorMsg = "Cancelado pelo usuário";
      await redisSet(postKey(id), JSON.stringify(post));
    } catch {}
  }

  return NextResponse.json({ ok: true });
}
