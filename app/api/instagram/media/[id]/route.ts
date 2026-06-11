import { NextRequest, NextResponse } from "next/server";
import { redisGet } from "@/lib/redis";

export const maxDuration = 10;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const raw = await redisGet(`ig:media:${params.id}`);
  if (!raw) return new NextResponse("Not found", { status: 404 });

  const pipe     = raw.indexOf("|");
  const mimeType = raw.slice(0, pipe);
  const base64   = raw.slice(pipe + 1);
  const buffer   = Buffer.from(base64, "base64");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(buffer.length),
      "Cache-Control": "public, max-age=900",
    },
  });
}
