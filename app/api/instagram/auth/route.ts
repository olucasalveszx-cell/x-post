import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const appId = process.env.INSTAGRAM_APP_ID;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3001";

  if (!appId) {
    return NextResponse.json({ error: "INSTAGRAM_APP_ID não configurado" }, { status: 500 });
  }

  const popup = req.nextUrl.searchParams.get("popup") === "1";
  const redirectUri = `${baseUrl}/api/instagram/callback`;
  const scope = "instagram_business_basic,instagram_business_content_publish";

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope,
    response_type: "code",
    state: popup ? "popup" : "redirect",
    force_reauth: "true",
  });

  const oauthUrl = `https://www.instagram.com/oauth/authorize?${params}`;

  return NextResponse.redirect(oauthUrl);
}
