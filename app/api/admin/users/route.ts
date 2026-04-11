import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/adminAuth";
import { redisListAll, redisGet } from "@/lib/redis";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value ?? "";
  if (!verifyAdminToken(token)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const emails = (await redisListAll("users:list")) ?? [];

  const users = await Promise.all(
    emails.map(async (email) => {
      const raw = await redisGet(`user:${email}`);
      if (!raw) return null;
      const u = JSON.parse(raw);
      return { name: u.name, email: u.email, createdAt: u.createdAt };
    }),
  );

  const sorted = users
    .filter(Boolean)
    .sort((a, b) => new Date(b!.createdAt).getTime() - new Date(a!.createdAt).getTime());

  return NextResponse.json({ users: sorted });
}
