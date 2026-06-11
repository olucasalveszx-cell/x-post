import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { redisLRange } from "@/lib/redis";

export interface AdminImageEntry {
  url: string;
  email: string;
  prompt: string;
  source: string;
  createdAt: string;
}

export async function GET() {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("xpz_admin");
  if (!adminCookie?.value) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const raw = await redisLRange("images:global", 0, 299);
  const images: AdminImageEntry[] = raw
    .map((r) => { try { return JSON.parse(r) as AdminImageEntry; } catch { return null; } })
    .filter(Boolean) as AdminImageEntry[];

  return NextResponse.json({ images, total: images.length });
}
