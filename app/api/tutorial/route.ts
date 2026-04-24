import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redisGet, redisSet } from "@/lib/redis";

const KEY = "tutorial:current";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ tutorial: null, hasNew: false });

  const email = session.user.email.toLowerCase().trim();
  const raw = await redisGet(KEY);
  if (!raw) return NextResponse.json({ tutorial: null, hasNew: false });

  const tutorial = JSON.parse(raw);
  const seen = await redisGet(`tutorial:seen:${email}`);
  return NextResponse.json({ tutorial, hasNew: seen !== tutorial.version });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const email = session.user.email.toLowerCase().trim();
  const raw = await redisGet(KEY);
  if (!raw) return NextResponse.json({ ok: true });

  const tutorial = JSON.parse(raw);
  await redisSet(`tutorial:seen:${email}`, tutorial.version);
  return NextResponse.json({ ok: true });
}
