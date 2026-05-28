import { NextRequest, NextResponse } from "next/server";

function popupHtml(payload: Record<string, string>) {
  const json = JSON.stringify(payload).replace(/</g, "\\u003c");
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "*";
  return new NextResponse(
    `<!DOCTYPE html><html><body><script>
      var p = ${json};
      /* 1. localStorage — funciona em PWA iOS e qualquer contexto */
      try { localStorage.setItem("ig_auth_result", JSON.stringify(p)); } catch(e) {}
      /* 2. postMessage — fallback para desktop */
      try { window.opener?.postMessage({ type:"ig_auth", ...p }, "${base}"); } catch(e) {}
      /* 3. BroadcastChannel — fallback moderno */
      try { var bc = new BroadcastChannel("ig_auth"); bc.postMessage({ type:"ig_auth", ...p }); bc.close(); } catch(e) {}
      setTimeout(function(){ window.close(); }, 300);
    </script><p style="font-family:sans-serif;text-align:center;padding:2rem">Conectado! Esta janela vai fechar automaticamente.</p></body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3001";
  const editorUrl = `${baseUrl}/editor`;
  const isPopup = req.nextUrl.searchParams.get("state") === "popup";

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
    // NÃO usar fallback para token curto — page tokens só são permanentes se
    // gerados a partir de um long-lived user token
    if (!longData.access_token) throw new Error("Falha ao obter token de longa duração: " + JSON.stringify(longData));
    const longToken = longData.access_token;
    console.log("[ig/callback] long-lived token obtido, expires_in:", longData.expires_in);

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

    // 5. Retorna dados ao editor (popup ou redirect)
    const expiresAt = Date.now() + (longData.expires_in ?? 5184000) * 1000;
    const payload = {
      ig_token: igToken,
      ig_account: igAccountId,
      ig_username: igUsername,
      ig_expires_at: String(expiresAt),
      ig_success: "1",
    };

    if (isPopup) return popupHtml(payload);

    return NextResponse.redirect(`${editorUrl}?${new URLSearchParams(payload)}`);
  } catch (err: any) {
    console.error("[instagram/callback]", err.message);
    if (isPopup) return popupHtml({ ig_error: err.message });
    return NextResponse.redirect(`${editorUrl}?ig_error=${encodeURIComponent(err.message)}`);
  }
}
