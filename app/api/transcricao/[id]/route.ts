import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redisGet, redisDel, redisLRem } from "@/lib/redis";
import { supabaseAdmin } from "@/lib/supabase";
import { transcriptionKey, transcriptionsListKey, TranscriptionRecord } from "@/app/api/transcricao/process/route";

const BUCKET = "schedule-images";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const raw = await redisGet(transcriptionKey(id));
  if (!raw) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const record: TranscriptionRecord = JSON.parse(raw);
  if (record.email !== email) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  return NextResponse.json({ record });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const raw = await redisGet(transcriptionKey(id));
  if (!raw) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const record: TranscriptionRecord = JSON.parse(raw);
  if (record.email !== email) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  // Delete file from Supabase Storage
  if (record.filePath) {
    await supabaseAdmin.storage.from(BUCKET).remove([record.filePath]).catch(() => {});
  }

  // Delete from Redis
  await redisDel(transcriptionKey(id));
  await redisLRem(transcriptionsListKey(email), 0, id);

  return NextResponse.json({ ok: true });
}
