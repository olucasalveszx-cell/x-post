import { NextRequest, NextResponse } from "next/server";
import { redisGet } from "@/lib/redis";

export const maxDuration = 10;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const raw = await redisGet(`ig:media:${params.id}`);
  if (!raw) return new NextResponse("Not found", { status: 404 });

  let entry: { b64: string; mime: string };
  try { entry = JSON.parse(raw); } catch { return new NextResponse("Invalid", { status: 500 }); }

  const buffer = Buffer.from(entry.b64, "base64");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": entry.mime,
      "Content-Length": String(buffer.length),
      "Cache-Control": "public, max-age=900",
    },
  });
}
