import { redisGet, redisSet, redisListAll, redisLRem, redisSetNX } from "@/lib/redis";

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
    if (d.status_code === "ERROR")   throw new Error("Container falhou no processamento");
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

export async function processPendingPosts(): Promise<{ published: number; failed: number; skipped: number; total: number }> {
  const now = Date.now();

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

    const lock = await redisSetNX(`schedule:lock:${id}`, "1", 180);
    if (!lock) { skipped++; continue; }

    await redisLRem(PENDING_KEY, 0, id);
    try {
      const igPostId = await publishPost(post);
      post.status = "published";
      post.igPostId = igPostId;
      published++;
    } catch (err: any) {
      post.status = "failed";
      post.errorMsg = err.message;
      failed++;
      console.error(`[schedule] falhou post ${id}:`, err.message);
    }
    await redisSet(postKey(id), JSON.stringify(post));
  }

  return { published, failed, skipped, total: allIds.length };
}
