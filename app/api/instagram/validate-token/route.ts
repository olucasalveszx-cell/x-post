import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 10;

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ valid: false });

  try {
    const res = await fetch(
      "https://graph.instagram.com/v22.0/me?fields=id,username,account_type",
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      }
    );
    const data = await res.json();
    if (data.error) {
      const code = data.error.code ?? 0;
      console.log("[ig/validate]", code, data.error.message);
      if (code === 190 || code === 102 || code === 2500) {
        return NextResponse.json({ valid: false, code });
      }
      // code 100 = Unsupported (conta pessoal ou sem permissão) — token em si é válido
      return NextResponse.json({ valid: true, warn: data.error.message });
    }
    return NextResponse.json({ valid: true, username: data.username, accountType: data.account_type });
  } catch {
    return NextResponse.json({ valid: true });
  }
}
