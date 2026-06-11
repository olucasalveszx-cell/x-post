import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const maxDuration = 10;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ isAdmin: false });

  const adminEmail = (process.env.ADMIN_EMAIL ?? "").toLowerCase().trim();
  const userEmail  = session.user.email.toLowerCase().trim();

  return NextResponse.json({ isAdmin: adminEmail !== "" && userEmail === adminEmail });
}
