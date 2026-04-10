// Armazena imagens temporárias para que o Instagram possa acessar via URL pública
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

// Map global: id → { base64, mimeType, expires }
const store = new Map<string, { b64: string; mime: string; exp: number }>();

// Limpa entradas expiradas
function cleanup() {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (v.exp < now) store.delete(k);
  }
}

// POST /api/instagram/media → armazena imagem, retorna { id, url }
export async function POST(req: NextRequest) {
  cleanup();
  const { base64, mimeType = "image/jpeg" } = await req.json();
  if (!base64) return NextResponse.json({ error: "base64 obrigatório" }, { status: 400 });

  const id = randomUUID();
  store.set(id, { b64: base64, mime: mimeType, exp: Date.now() + 30 * 60 * 1000 }); // 30min

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3001";
  return NextResponse.json({ id, url: `${baseUrl}/api/instagram/media/${id}` });
}

// GET /api/instagram/media/[id] via dynamic route abaixo
export { store };
