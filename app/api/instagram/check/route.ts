import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { igToken, igAccountId } = await req.json();
  if (!igToken) return NextResponse.json({ error: "igToken obrigatório" }, { status: 400 });

  const appId = (process.env.INSTAGRAM_APP_ID ?? "").replace(/^﻿/, "").trim();
  const appSecret = (process.env.INSTAGRAM_APP_SECRET ?? "").replace(/^﻿/, "").trim();
  const results: Record<string, any> = { igAccountId, appIdConfigured: !!appId };
  const bearerH = { Authorization: `Bearer ${igToken}` };

  async function tryFetch(label: string, url: string, init?: RequestInit) {
    try {
      const r = await fetch(url, init);
      results[label] = { status: r.status, body: await r.json() };
    } catch (e: any) {
      results[label] = { fetchError: e.message };
    }
  }

  // 1. /me SEM autenticação — testa se o endpoint existe
  await tryFetch("no_auth", "https://graph.instagram.com/v22.0/me?fields=id,username");

  // 2. /me Bearer v22.0
  await tryFetch("v22_bearer", "https://graph.instagram.com/v22.0/me?fields=id,username,account_type", { headers: bearerH });

  // 3. /me query v22.0
  await tryFetch("v22_query", `https://graph.instagram.com/v22.0/me?fields=id,username,account_type&access_token=${igToken}`);

  // 4. /me Bearer v21.0
  await tryFetch("v21_bearer", "https://graph.instagram.com/v21.0/me?fields=id,username,account_type", { headers: bearerH });

  // 5. /me Bearer v20.0
  await tryFetch("v20_bearer", "https://graph.instagram.com/v20.0/me?fields=id,username,account_type", { headers: bearerH });

  // 6. /me sem versão — Bearer
  await tryFetch("novrs_bearer", "https://graph.instagram.com/me?fields=id,username,account_type", { headers: bearerH });

  // 7. Token como query param no formato antigo (Basic Display)
  await tryFetch("legacy_query", `https://graph.instagram.com/me?fields=id,username&access_token=${igToken}`);

  // 8. Primeiros 40 chars do token (tipo/formato)
  results.token_prefix = igToken ? igToken.slice(0, 40) + "..." : "VAZIO";

  return NextResponse.json(results, { status: 200 });
}
