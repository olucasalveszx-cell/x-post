import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/adminAuth";
import { redisListAll, redisGet } from "@/lib/redis";

export const maxDuration = 30;

export interface AdminDraftMeta {
  id: string;
  email: string;
  name: string;
  slideCount: number;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value ?? "";
  if (!verifyAdminToken(token)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const emails = await redisListAll("users:list");

  const allDrafts: AdminDraftMeta[] = [];

  await Promise.all(
    emails.map(async (email) => {
      const ids = await redisListAll(`drafts:${email}`);
      await Promise.all(
        ids.map(async (id) => {
          const raw = await redisGet(`draftmeta:${email}:${id}`);
          if (!raw) return;
          try {
            const meta = JSON.parse(raw);
            if (!meta.id) return;
            allDrafts.push({ ...meta, email });
          } catch {}
        })
      );
    })
  );

  allDrafts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return NextResponse.json({ drafts: allDrafts.slice(0, 100), total: allDrafts.length });
}
