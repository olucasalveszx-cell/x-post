import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 15;

const GRAPH = "https://graph.facebook.com/v20.0";

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token?.trim()) return NextResponse.json({ error: "Token obrigatório" }, { status: 400 });

  try {
    // 1. Verifica se o token é válido
    const meRes = await fetch(`${GRAPH}/me?fields=id,name&access_token=${token}`, {
      signal: AbortSignal.timeout(8000),
    });
    const meData = await meRes.json();
    if (meData.error) {
      return NextResponse.json({ error: `Token inválido: ${meData.error.message}` }, { status: 400 });
    }

    // 2. Tenta encontrar a conta Instagram Business via páginas do Facebook
    const pagesRes = await fetch(
      `${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${token}`,
      { signal: AbortSignal.timeout(8000) }
    );
    const pagesData = await pagesRes.json();
    const pages: any[] = pagesData.data ?? [];

    for (const page of pages) {
      if (!page.instagram_business_account?.id) continue;

      const igId = page.instagram_business_account.id;
      const igToken = page.access_token ?? token;

      const igRes = await fetch(
        `${GRAPH}/${igId}?fields=username,profile_picture_url&access_token=${igToken}`,
        { signal: AbortSignal.timeout(8000) }
      );
      const igData = await igRes.json();
      if (igData.username) {
        return NextResponse.json({
          accountId: igId,
          username: igData.username,
          token: igToken,
        });
      }
    }

    // 3. Fallback: tenta diretamente no perfil do usuário
    const fallbackRes = await fetch(
      `${GRAPH}/me?fields=instagram_business_account&access_token=${token}`,
      { signal: AbortSignal.timeout(8000) }
    );
    const fallbackData = await fallbackRes.json();
    if (fallbackData.instagram_business_account?.id) {
      const igId = fallbackData.instagram_business_account.id;
      const igRes = await fetch(
        `${GRAPH}/${igId}?fields=username&access_token=${token}`,
        { signal: AbortSignal.timeout(8000) }
      );
      const igData = await igRes.json();
      return NextResponse.json({
        accountId: igId,
        username: igData.username ?? "instagram",
        token,
      });
    }

    return NextResponse.json(
      { error: "Nenhuma conta Instagram Business encontrada vinculada a este token." },
      { status: 404 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Erro ao resolver token" }, { status: 500 });
  }
}
