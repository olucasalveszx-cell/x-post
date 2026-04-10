import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3001";
  const editorUrl = `${baseUrl}/editor`;

  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${editorUrl}?ig_error=cancelled`);
  }

  const appId = process.env.META_APP_ID!;
  const appSecret = process.env.META_APP_SECRET!;
  const redirectUri = `${baseUrl}/api/instagram/callback`;

  try {
    // 1. Troca code por token de curta duração
    const shortRes = await fetch(
      `https://graph.facebook.com/v20.0/oauth/access_token` +
        `?client_id=${appId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&client_secret=${appSecret}` +
        `&code=${code}`
    );
    const shortData = await shortRes.json();
    if (!shortData.access_token) throw new Error("Token inválido: " + JSON.stringify(shortData));

    // 2. Troca por token de longa duração (60 dias)
    const longRes = await fetch(
      `https://graph.facebook.com/v20.0/oauth/access_token` +
        `?grant_type=fb_exchange_token` +
        `&client_id=${appId}` +
        `&client_secret=${appSecret}` +
        `&fb_exchange_token=${shortData.access_token}`
    );
    const longData = await longRes.json();
    const longToken = longData.access_token ?? shortData.access_token;

    // 3. Lista páginas do Facebook do usuário
    const pagesRes = await fetch(
      `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${longToken}`
    );
    const pagesData = await pagesRes.json();
    const pages: any[] = pagesData.data ?? [];
    console.log("[ig/callback] Páginas:", JSON.stringify(pagesData));

    // 4. Encontra conta Instagram Business conectada a alguma página
    let igAccountId: string | null = null;
    let igToken: string = longToken;
    let igUsername: string = "";

    for (const page of pages) {
      const igRes = await fetch(
        `https://graph.facebook.com/v20.0/${page.id}` +
          `?fields=instagram_business_account` +
          `&access_token=${page.access_token}`
      );
      const igData = await igRes.json();
      console.log(`[ig/callback] Página "${page.name}" → IG:`, JSON.stringify(igData));

      if (igData.instagram_business_account?.id) {
        igAccountId = igData.instagram_business_account.id;
        igToken = page.access_token;

        const userRes = await fetch(
          `https://graph.facebook.com/v20.0/${igAccountId}` +
            `?fields=username,profile_picture_url` +
            `&access_token=${igToken}`
        );
        const userData = await userRes.json();
        igUsername = userData.username ?? "";
        break;
      }
    }

    // Fallback: tenta buscar Instagram direto no perfil do usuário
    if (!igAccountId) {
      const meRes = await fetch(
        `https://graph.facebook.com/v20.0/me?fields=instagram_business_account&access_token=${longToken}`
      );
      const meData = await meRes.json();
      console.log("[ig/callback] Fallback me→IG:", JSON.stringify(meData));

      if (meData.instagram_business_account?.id) {
        igAccountId = meData.instagram_business_account.id;
        const userRes = await fetch(
          `https://graph.facebook.com/v20.0/${igAccountId}?fields=username&access_token=${longToken}`
        );
        const userData = await userRes.json();
        igUsername = userData.username ?? "";
      }
    }

    if (!igAccountId) {
      const pageNames = pages.map((p: any) => p.name).join(", ") || "nenhuma";
      console.log("[ig/callback] Sem IG Business. Páginas:", pageNames);
      return NextResponse.redirect(
        `${editorUrl}?ig_error=no_business_account&pages=${encodeURIComponent(pageNames)}`
      );
    }

    // 5. Redireciona de volta ao editor com os dados no URL
    const params = new URLSearchParams({
      ig_token: igToken,
      ig_account: igAccountId,
      ig_username: igUsername,
      ig_success: "1",
    });

    return NextResponse.redirect(`${editorUrl}?${params}`);
  } catch (err: any) {
    console.error("[instagram/callback]", err.message);
    return NextResponse.redirect(`${editorUrl}?ig_error=${encodeURIComponent(err.message)}`);
  }
}
