import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminToken } from "@/lib/adminAuth";
import { ADMIN_COOKIE } from "@/lib/adminCookie";
import { redisGet, redisSet, redisDel, redisLPush, redisLRange, redisLRem } from "@/lib/redis";
import { put, del } from "@vercel/blob";
import { v4 as uuid } from "uuid";

export const maxDuration = 30;

const LIST_KEY = "xpost:image:ids";
const imgKey = (id: string) => `xpost:image:${id}`;

async function checkAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  return token && verifyAdminToken(token);
}

export async function GET() {
  if (!await checkAdmin()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const ids = await redisLRange(LIST_KEY, 0, 999);
  const images = (await Promise.all(ids.map(async (id) => {
    const raw = await redisGet(imgKey(id));
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }))).filter(Boolean);

  return NextResponse.json({ images });
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { base64, mimeType, name } = await req.json();
  if (!base64 || !mimeType) return NextResponse.json({ error: "base64 e mimeType obrigatórios" }, { status: 400 });

  const id = uuid();
  const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const filename = `xpost-bank/${id}.${ext}`;

  const buffer = Buffer.from(base64, "base64");
  const blob = await put(filename, buffer, { access: "public", contentType: mimeType });

  const entry = { id, url: blob.url, name: name ?? filename, uploadedAt: new Date().toISOString() };
  await redisSet(imgKey(id), JSON.stringify(entry));
  await redisLPush(LIST_KEY, id);

  return NextResponse.json({ image: entry });
}

export async function DELETE(req: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  const raw = await redisGet(imgKey(id));
  if (raw) {
    try {
      const entry = JSON.parse(raw);
      if (entry.url) await del(entry.url).catch(() => {});
    } catch {}
    await redisDel(imgKey(id));
  }
  await redisLRem(LIST_KEY, 0, id);

  return NextResponse.json({ ok: true });
}
