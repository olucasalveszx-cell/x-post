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

  const appId = (process.env.INSTAGRAM_APP_ID ?? "").replace(/^﻿/, "").trim();
  const appSecret = (process.env.INSTAGRAM_APP_SECRET ?? "").replace(/^﻿/, "").trim();
  const redirectUri = `${baseUrl}/api/instagram/callback`;

  console.log("[ig/callback] appId:", JSON.stringify(appId), "redirectUri:", redirectUri);

  try {
    // 1. Troca code por token de curta duração (Instagram Business Login)
    const shortRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
    });
    const shortData = await shortRes.json();
    if (!shortData.access_token) throw new Error("Token inválido: " + JSON.stringify(shortData));
    console.log("[ig/callback] short-lived token obtido para user_id:", shortData.user_id);

    // 2. Troca por token de longa duração (60 dias)
    const longRes = await fetch(
      `https://graph.instagram.com/access_token` +
        `?grant_type=ig_exchange_token` +
        `&client_id=${appId}` +
        `&client_secret=${appSecret}` +
        `&access_token=${shortData.access_token}`
    );
    const longData = await longRes.json();
    if (!longData.access_token) throw new Error("Falha ao obter token de longa duração: " + JSON.stringify(longData));
    const longToken = longData.access_token;
    console.log("[ig/callback] long-lived token obtido, expires_in:", longData.expires_in);

    // 3. Busca informações da conta Instagram
    const userRes = await fetch(
      `https://graph.instagram.com/me?fields=user_id,username,profile_picture_url,account_type&access_token=${longToken}`
    );
    const userData = await userRes.json();
    console.log("[ig/callback] user data:", JSON.stringify(userData));

    const igAccountId: string = userData.user_id ?? String(shortData.user_id ?? "");
    const igUsername: string = userData.username ?? "";
    const igPicture: string = userData.profile_picture_url ?? "";

    if (!igAccountId) throw new Error("Não foi possível obter ID da conta Instagram");

    // 4. Retorna dados ao editor (popup ou redirect)
    const expiresAt = Date.now() + (longData.expires_in ?? 5184000) * 1000;
    const payload = {
      ig_token: longToken,
      ig_account: igAccountId,
      ig_username: igUsername,
      ig_picture: igPicture,
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
