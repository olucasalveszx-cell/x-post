import { NextRequest, NextResponse } from "next/server";

function popupHtml(payload: Record<string, string>) {
  const json = JSON.stringify(payload).replace(/</g, "\\u003c");
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "*";
  return new NextResponse(
    `<!DOCTYPE html><html><body><script>
      var p = ${json};
      try { localStorage.setItem("ig_auth_result", JSON.stringify(p)); } catch(e) {}
      try { window.opener?.postMessage({ type:"ig_auth", ...p }, "${base}"); } catch(e) {}
      try { var bc = new BroadcastChannel("ig_auth"); bc.postMessage({ type:"ig_auth", ...p }); bc.close(); } catch(e) {}
      setTimeout(function(){ window.close(); }, 300);
    </script><p style="font-family:sans-serif;text-align:center;padding:2rem">Conectado! Esta janela vai fechar automaticamente.</p></body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}

export async function GET(req: NextRequest) {
  const baseUrl   = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3001";
  const editorUrl = `${baseUrl}/editor`;
  const isPopup   = req.nextUrl.searchParams.get("state") === "popup";
  const code      = req.nextUrl.searchParams.get("code");
  const error     = req.nextUrl.searchParams.get("error");

  if (error || !code) {
    const msg = req.nextUrl.searchParams.get("error_description") ?? "cancelled";
    if (isPopup) return popupHtml({ ig_error: msg });
    return NextResponse.redirect(`${editorUrl}?ig_error=${encodeURIComponent(msg)}`);
  }

  const appId     = (process.env.INSTAGRAM_APP_ID     ?? "").replace(/^﻿/, "").trim();
  const appSecret = (process.env.INSTAGRAM_APP_SECRET ?? "").replace(/^﻿/, "").trim();
  const redirectUri = `${baseUrl}/api/instagram/callback`;

  try {
    // 1. Code → short-lived token
    const shortRes  = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: appId, client_secret: appSecret, grant_type: "authorization_code", redirect_uri: redirectUri, code }),
    });
    const shortData = await shortRes.json();
    if (!shortData.access_token) throw new Error("Token inválido: " + JSON.stringify(shortData));
    console.log("[ig/callback] short token user_id:", shortData.user_id);

    // 2. Short → long-lived (60 dias)
    let longToken   = shortData.access_token;
    let longExpires = 3600;
    try {
      const longRes  = await fetch(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_id=${appId}&client_secret=${appSecret}&access_token=${shortData.access_token}`);
      const longData = await longRes.json();
      console.log("[ig/callback] long token:", JSON.stringify(longData));
      if (longData.access_token) { longToken = longData.access_token; longExpires = longData.expires_in ?? 5184000; }
    } catch (e: any) { console.warn("[ig/callback] long token falhou:", e.message); }

    // 3. Perfil via /me
    const igAccountId = String(shortData.user_id ?? "");
    let igUsername = "", igPicture = "";
    try {
      const meRes  = await fetch(`https://graph.instagram.com/v22.0/me?fields=id,username,name,profile_picture_url,account_type&access_token=${longToken}`);
      const meData = await meRes.json();
      console.log("[ig/callback] /me:", JSON.stringify(meData));
      igUsername = meData.username ?? meData.name ?? "";
      igPicture  = meData.profile_picture_url ?? "";
    } catch (e: any) { console.warn("[ig/callback] perfil:", e.message); }

    if (!igAccountId) throw new Error("Não foi possível obter ID da conta Instagram");

    const payload = {
      ig_token:      longToken,
      ig_account:    igAccountId,
      ig_username:   igUsername,
      ig_picture:    igPicture,
      ig_expires_at: String(Date.now() + longExpires * 1000),
      ig_success:    "1",
    };

    if (isPopup) return popupHtml(payload);
    return NextResponse.redirect(`${editorUrl}?${new URLSearchParams(payload)}`);

  } catch (err: any) {
    console.error("[ig/callback]", err.message);
    if (isPopup) return popupHtml({ ig_error: err.message });
    return NextResponse.redirect(`${editorUrl}?ig_error=${encodeURIComponent(err.message)}`);
  }
}
