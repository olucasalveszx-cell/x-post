import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const appId = process.env.INSTAGRAM_APP_ID;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3001";

  if (!appId) {
    return NextResponse.json({ error: "INSTAGRAM_APP_ID não configurado" }, { status: 500 });
  }

  const popup = req.nextUrl.searchParams.get("popup") === "1";
  const redirectUri = `${baseUrl}/api/instagram/callback`;
  const scope = [
    "instagram_business_basic",
    "instagram_business_content_publish",
  ].join(",");

  const oauthUrl =
    `https://www.instagram.com/oauth/authorize` +
    `?client_id=${appId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${scope}` +
    `&response_type=code` +
    `&state=${popup ? "popup" : "redirect"}`;

  return NextResponse.redirect(oauthUrl);
}
