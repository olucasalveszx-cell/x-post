import { NextRequest, NextResponse } from "next/server";
import { redisGet, redisSet, redisZRangeByScore, redisZRem } from "@/lib/redis";

export const maxDuration = 300;

const QUEUE_KEY = "schedule:queue";
const GRAPH = "https://graph.facebook.com/v21.0";

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

function postKey(id: string) { return `schedule:post:${id}`; }

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

async function publishPost(post: ScheduledPost): Promise<string> {
  const { igAccountId, igToken, imageUrls, caption, mediaType } = post;

  if (mediaType === "story") {
    const r = await fetch(`${GRAPH}/${igAccountId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrls[0], media_type: "STORIES", access_token: igToken }),
    });
    const d = await r.json();
    if (!d.id) throw new Error(d.error?.message ?? "Erro ao criar story");
    await waitUntilReady(d.id, igToken);
    const pub = await fetch(`${GRAPH}/${igAccountId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: d.id, access_token: igToken }),
    });
    const pd = await pub.json();
    if (!pd.id) throw new Error(pd.error?.message ?? "Erro ao publicar story");
    return pd.id;
  }

  if (imageUrls.length === 1) {
    const r = await fetch(`${GRAPH}/${igAccountId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrls[0], caption, access_token: igToken }),
    });
    const d = await r.json();
    if (!d.id) throw new Error(d.error?.message ?? "Erro ao criar post");
    await waitUntilReady(d.id, igToken);
    const pub = await fetch(`${GRAPH}/${igAccountId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: d.id, access_token: igToken }),
    });
    const pd = await pub.json();
    if (!pd.id) throw new Error(pd.error?.message ?? "Erro ao publicar post");
    return pd.id;
  }

  // Carrossel
  const childIds: string[] = [];
  for (const url of imageUrls) {
    const r = await fetch(`${GRAPH}/${igAccountId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: url, is_carousel_item: true, access_token: igToken }),
    });
    const d = await r.json();
    if (!d.id) throw new Error(d.error?.message ?? "Erro ao criar item do carrossel");
    childIds.push(d.id);
  }
  await Promise.all(childIds.map((id) => waitUntilReady(id, igToken)));

  const r = await fetch(`${GRAPH}/${igAccountId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ media_type: "CAROUSEL", children: childIds.join(","), caption, access_token: igToken }),
  });
  const d = await r.json();
  if (!d.id) throw new Error(d.error?.message ?? "Erro ao criar carrossel");
  await waitUntilReady(d.id, igToken);

  const pub = await fetch(`${GRAPH}/${igAccountId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: d.id, access_token: igToken }),
  });
  const pd = await pub.json();
  if (!pd.id) throw new Error(pd.error?.message ?? "Erro ao publicar carrossel");
  return pd.id;
}

export async function GET(req: NextRequest) {
  // Vercel injeta automaticamente CRON_SECRET no header Authorization
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();

  // Busca posts vencidos na fila ordenada (score ≤ agora)
  const dueIds: string[] = await redisZRangeByScore(QUEUE_KEY, 0, now);

  if (!dueIds.length) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  let published = 0, failed = 0;

  for (const id of dueIds) {
    // Remove da fila imediatamente para evitar dupla execução
    await redisZRem(QUEUE_KEY, id);

    const raw = await redisGet(postKey(id));
    if (!raw) continue;

    let post: ScheduledPost;
    try { post = JSON.parse(raw); } catch { continue; }

    if (post.status !== "scheduled") continue;

    try {
      const igPostId = await publishPost(post);
      post.status = "published";
      post.igPostId = igPostId;
      published++;
      console.log(`[cron/publish] ✓ ${id} → igPostId ${igPostId}`);
    } catch (err: any) {
      post.status = "failed";
      post.errorMsg = err.message;
      failed++;
      console.error(`[cron/publish] ✗ ${id}:`, err.message);
    }

    await redisSet(postKey(id), JSON.stringify(post));
  }

  return NextResponse.json({ ok: true, processed: dueIds.length, published, failed });
}
