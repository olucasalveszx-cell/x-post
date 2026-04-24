import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redisGet, redisSet } from "@/lib/redis";

const KEY = "tutorial:current";

export async function GET() {
  const raw = await redisGet(KEY);
  return NextResponse.json({ tutorial: raw ? JSON.parse(raw) : null });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  if (!session?.user?.email || session.user.email.toLowerCase() !== adminEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { url, title, description } = await req.json();
  if (!url) return NextResponse.json({ error: "URL obrigatória" }, { status: 400 });

  const tutorial = {
    url,
    title: title?.trim() || "Tutorial",
    description: description?.trim() || "",
    uploadedAt: new Date().toISOString(),
    version: Date.now().toString(),
  };
  await redisSet(KEY, JSON.stringify(tutorial));
  return NextResponse.json({ tutorial });
}
