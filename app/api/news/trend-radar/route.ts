import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTrendPredictions, generateTrendPredictions } from "@/lib/trend-radar";

export const maxDuration = 45;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const refresh = req.nextUrl.searchParams.get("refresh") === "true";

  try {
    const predictions = refresh
      ? await generateTrendPredictions()
      : await getTrendPredictions();

    return NextResponse.json({ predictions });
  } catch (err: any) {
    console.error("[trend-radar]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
