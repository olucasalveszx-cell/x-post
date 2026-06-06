import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redisGet, redisListAll } from "@/lib/redis";
import { transcriptionKey, transcriptionsListKey, TranscriptionRecord } from "@/app/api/transcricao/process/route";

export const maxDuration = 15;

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const ids = await redisListAll(transcriptionsListKey(email));
  const records: Partial<TranscriptionRecord>[] = [];

  const raws = await Promise.all(ids.slice(0, 50).map(id => redisGet(transcriptionKey(id)).catch(() => null)));

  for (const raw of raws) {
    if (!raw) continue;
    try {
      const r: TranscriptionRecord = JSON.parse(raw);
      // Return summary only — no full transcript (keeps payload small)
      records.push({
        id: r.id, title: r.title, sourceType: r.sourceType,
        language: r.language, duration: r.duration, wordCount: r.wordCount,
        summary: { short: r.summary?.short ?? "", medium: "", detailed: "" },
        topics: { main: r.topics?.main ?? "", subtopics: [], keywords: r.topics?.keywords ?? [], insights: [], cta: "" },
        createdAt: r.createdAt, status: r.status, errorMsg: r.errorMsg,
      });
    } catch {}
  }

  return NextResponse.json({ records });
}
