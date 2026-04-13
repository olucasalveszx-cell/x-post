import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCreditsInfo } from "@/lib/credits";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const info = await getCreditsInfo(email);
  return NextResponse.json(info);
}
