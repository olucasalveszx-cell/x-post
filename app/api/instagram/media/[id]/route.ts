import { NextRequest, NextResponse } from "next/server";
import { redisGet } from "@/lib/redis";

export const maxDuration = 15;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const blobUrl = await redisGet(`ig:media:${params.id}`);
  if (!blobUrl) return new NextResponse("Not found", { status: 404 });

  // Blob privado — buscar server-side com o token de autorização
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(blobUrl, { headers, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return new NextResponse("Blob not found", { status: 404 });

    const buffer = await res.arrayBuffer();
    const ct     = res.headers.get("content-type") ?? "image/jpeg";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": ct,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "public, max-age=900",
      },
    });
  } catch {
    return new NextResponse("Erro ao buscar imagem", { status: 500 });
  }
}
