import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

// Singleton global para sobreviver hot-reload
if (!(globalThis as any).__mediaStore) {
  (globalThis as any).__mediaStore = new Map<string, { b64: string; mime: string; exp: number }>();
}
const store: Map<string, { b64: string; mime: string; exp: number }> = (globalThis as any).__mediaStore;

function cleanup() {
  const now = Date.now();
  store.forEach((v, k) => { if (v.exp < now) store.delete(k); });
}

export async function POST(req: NextRequest) {
  cleanup();
  const { base64, mimeType = "image/jpeg" } = await req.json();
  if (!base64) return NextResponse.json({ error: "base64 obrigatório" }, { status: 400 });

  const id = randomUUID();
  store.set(id, { b64: base64, mime: mimeType, exp: Date.now() + 30 * 60 * 1000 });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3001";
  return NextResponse.json({ id, url: `${baseUrl}/api/instagram/media/${id}` });
}
