import { NextResponse } from "next/server";
import { redisGet, redisLRange } from "@/lib/redis";

const LIST_KEY = "xpost:image:ids";
const imgKey = (id: string) => `xpost:image:${id}`;

export async function GET() {
  const ids = await redisLRange(LIST_KEY, 0, 199);
  const images = (await Promise.all(
    ids.map(async (id) => {
      const raw = await redisGet(imgKey(id));
      if (!raw) return null;
      try { return JSON.parse(raw); } catch { return null; }
    })
  )).filter(Boolean);
  return NextResponse.json({ images });
}
