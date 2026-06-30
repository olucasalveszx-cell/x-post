import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { syncPerformanceMetrics, getTopPerformers } from "@/lib/performance-loop";

export const maxDuration = 60;

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { updated, errors } = await syncPerformanceMetrics(email);
    const topPerformers = await getTopPerformers(email, 5);
    return NextResponse.json({ updated, errors, topPerformers });
  } catch (err: any) {
    console.error("[sync-performance]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
