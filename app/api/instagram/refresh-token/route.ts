import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 15;

// Meta permite renovar um long-lived user token chamando o mesmo endpoint de troca.
// Isso estende o token por mais 60 dias sem que o usuário precise reautorizar.
export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: "Token obrigatório" }, { status: 400 });

  const appId     = process.env.META_APP_ID!;
  const appSecret = process.env.META_APP_SECRET!;

  try {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/oauth/access_token` +
        `?grant_type=fb_exchange_token` +
        `&client_id=${appId}` +
        `&client_secret=${appSecret}` +
        `&fb_exchange_token=${token}`,
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
