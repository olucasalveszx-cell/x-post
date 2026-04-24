import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { v4 as uuid } from "uuid";
import {
  TOPIC_DEFS,
  getAllTopics,
  getTopicVideos,
  setTopicVideos,
  MemberVideo,
} from "@/lib/members-area";

function isAdmin(email: string) {
  return email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase().trim();
}

export async function GET() {
  const topics = await getAllTopics();
  return NextResponse.json({ topics });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdmin(session.user.email))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { topicId, title, description, url } = await req.json();

  if (!TOPIC_DEFS.find((t) => t.id === topicId))
    return NextResponse.json({ error: "Tópico inválido" }, { status: 400 });
  if (!url?.trim())
    return NextResponse.json({ error: "URL obrigatória" }, { status: 400 });

  const videos = await getTopicVideos(topicId);
  const newVideo: MemberVideo = {
    id: uuid(),
    title: title?.trim() || "Sem título",
    description: description?.trim() || "",
    url: url.trim(),
    addedAt: new Date().toISOString(),
  };
  videos.push(newVideo);
  await setTopicVideos(topicId, videos);

  return NextResponse.json({ video: newVideo });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdmin(session.user.email))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const topicId = searchParams.get("topicId");
  const videoId = searchParams.get("videoId");

  if (!topicId || !videoId)
    return NextResponse.json({ error: "topicId e videoId obrigatórios" }, { status: 400 });

  const videos = await getTopicVideos(topicId);
  const updated = videos.filter((v) => v.id !== videoId);
  await setTopicVideos(topicId, updated);

  return NextResponse.json({ ok: true });
}
