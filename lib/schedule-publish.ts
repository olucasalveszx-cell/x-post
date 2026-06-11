import { redisGet, redisSet, redisListAll, redisLRem, redisSetNX, redisLPush } from "@/lib/redis";

const GRAPH = "https://graph.facebook.com/v21.0";
export const PENDING_KEY = "schedule:pending";

export interface ScheduledPost {
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

export function postKey(id: string)         { return `schedule:post:${id}`; }
export function userPostsKey(email: string) { return `schedule:user:${email}`; }

// Graph API espera form-encoded, não JSON. Arrays viram comma-separated strings.
async function igPost(url: string, params: Record<string, unknown>, token: string): Promise<any> {
  const form = new URLSearchParams();
  form.set("access_token", token);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    form.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const d = await res.json();
  if (d.error) throw new Error(d.error.message ?? JSON.stringify(d.error));
  return d;
}

// Aguarda container ficar FINISHED — lança erro em qualquer falha ou timeout
async function waitReady(id: string, token: string, timeoutMs = 60000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${GRAPH}/${id}?fields=status_code&access_token=${encodeURIComponent(token)}`);
    const d = await res.json();
    if (d.error) throw new Error(d.error.message ?? "Erro no container");
    if (d.status_code === "FINISHED") return;
    if (d.status_code === "ERROR")    throw new Error("Instagram rejeitou o container (ERROR)");
    if (d.status_code === "EXPIRED")  throw new Error("Container expirou antes de ficar pronto");
    await new Promise(r => setTimeout(r, 3000));
  }
  throw new Error(`Container não ficou pronto em ${timeoutMs / 1000}s`);
}

async function publishPost(post: ScheduledPost): Promise<string> {
  const { igAccountId, igToken, imageUrls, caption, mediaType } = post;

  const pause = (ms: number) => new Promise(r => setTimeout(r, ms));

  // Story
  if (mediaType === "story") {
    const c = await igPost(`${GRAPH}/${igAccountId}/media`, { image_url: imageUrls[0], media_type: "STORIES" }, igToken);
    await waitReady(c.id, igToken);
    await pause(1000);
    const p = await igPost(`${GRAPH}/${igAccountId}/media_publish`, { creation_id: c.id }, igToken);
    return p.id;
  }

  // Post único
  if (imageUrls.length === 1) {
    const c = await igPost(`${GRAPH}/${igAccountId}/media`, { image_url: imageUrls[0], caption }, igToken);
    await waitReady(c.id, igToken);
    await pause(1000);
    const p = await igPost(`${GRAPH}/${igAccountId}/media_publish`, { creation_id: c.id }, igToken);
    return p.id;
  }

  // Carousel — children como string separada por vírgula (formato que Graph API espera)
  const childIds = await Promise.all(
    imageUrls.map(url =>
      igPost(`${GRAPH}/${igAccountId}/media`, { image_url: url, is_carousel_item: true }, igToken).then(d => d.id)
    )
  );
  await Promise.all(childIds.map(id => waitReady(id, igToken)));
  const carousel = await igPost(`${GRAPH}/${igAccountId}/media`, {
    media_type: "CAROUSEL",
    children: childIds,
    caption,
  }, igToken);
  await waitReady(carousel.id, igToken);
  await pause(1000);
  const p = await igPost(`${GRAPH}/${igAccountId}/media_publish`, { creation_id: carousel.id }, igToken);
  return p.id;
}

const MAX_RETRIES = 3;

export async function processPendingPosts(): Promise<{ published: number; failed: number; skipped: number; total: number }> {
  const now = Date.now();

  await redisSet("cron:lastRun", new Date().toISOString()).catch(() => {});

  // Coleta todos os IDs pendentes (global + por usuário)
  const [pendingIds, users] = await Promise.all([
    redisListAll(PENDING_KEY),
    redisListAll("schedule:users"),
  ]);
  const userPostIds: string[] = [];
  const uniqueUsers = [...new Set(users.filter(Boolean))];
  const userLists = await Promise.all(uniqueUsers.map(email => redisListAll(userPostsKey(email))));
  userLists.forEach(ids => userPostIds.push(...ids));

  const allIds = [...new Set([...pendingIds, ...userPostIds].filter(Boolean))];

  let published = 0, failed = 0, skipped = 0;

  for (const id of allIds) {
    const raw = await redisGet(postKey(id));
    if (!raw) { await redisLRem(PENDING_KEY, 0, id); continue; }

    let post: ScheduledPost;
    try { post = JSON.parse(raw); } catch { continue; }

    if (post.status !== "scheduled") { await redisLRem(PENDING_KEY, 0, id); continue; }
    if (new Date(post.scheduledAt).getTime() > now) { skipped++; continue; }

    const lock = await redisSetNX(`schedule:lock:${id}`, "1", 180);
    if (!lock) { skipped++; continue; }

    await redisLRem(PENDING_KEY, 0, id);

    try {
      const igPostId = await publishPost(post);
      post.status = "published";
      post.igPostId = igPostId;
      published++;
    } catch (err: any) {
      const retries = (post.retries ?? 0) + 1;
      post.retries = retries;

      if (retries < MAX_RETRIES) {
        // Recoloca na fila para retry
        post.errorMsg = `Tentativa ${retries}/${MAX_RETRIES}: ${err.message}`;
        post.status = "scheduled"; // mantém agendado para retry
        await redisListAdd_safe(PENDING_KEY, id);
      } else {
        post.status = "failed";
        post.errorMsg = err.message;
        failed++;
      }
      console.error(`[schedule] post ${id} tentativa ${retries}:`, err.message);
    }
    await redisSet(postKey(id), JSON.stringify(post));
  }

  return { published, failed, skipped, total: allIds.length };
}

async function redisListAdd_safe(key: string, value: string): Promise<void> {
  await redisLRem(key, 0, value);
  await redisLPush(key, value);
}
