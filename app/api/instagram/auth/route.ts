import { NextResponse } from "next/server";

export async function GET() {
  const appId = process.env.META_APP_ID;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3001";

  if (!appId) {
    return NextResponse.json({ error: "META_APP_ID não configurado" }, { status: 500 });
  }

  const redirectUri = `${baseUrl}/api/instagram/callback`;
  const scope = [
    "instagram_basic",
    "instagram_content_publish",
    "pages_show_list",
  ].join(",");

  const oauthUrl =
    `https://www.facebook.com/dialog/oauth` +
    `?client_id=${appId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${scope}` +
    `&response_type=code`;

  return NextResponse.redirect(oauthUrl);
}
