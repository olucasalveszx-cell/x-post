import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 15;

// Instagram Business Login: renova token de longa duração por mais 60 dias
export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: "Token obrigatório" }, { status: 400 });

  try {
    const res = await fetch(
      `https://graph.instagram.com/refresh_access_token` +
        `?grant_type=ig_refresh_token` +
        `&access_token=${token}`,
      { signal: AbortSignal.timeout(10000) }
    );
    const data = await res.json();

    if (!data.access_token) {
      return NextResponse.json({ error: data.error?.message ?? "Falha ao renovar token" }, { status: 400 });
    }

    const expiresAt = Date.now() + (data.expires_in ?? 5184000) * 1000;
    console.log("[ig/refresh] token renovado, expires_in:", data.expires_in);
    return NextResponse.json({ token: data.access_token, expiresAt });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Erro ao renovar token" }, { status: 500 });
  }
}
