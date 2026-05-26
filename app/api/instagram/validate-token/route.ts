import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 10;

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ valid: false });

  try {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/me?fields=id&access_token=${token}`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await res.json();
    if (data.error) {
      const code = data.error.code ?? 0;
      console.log("[ig/validate]", code, data.error.message);
      // Só invalida em erros explícitos de auth — não em erros de rede ou temporários
      if (code === 190 || code === 102 || code === 2500) {
        return NextResponse.json({ valid: false, code });
      }
    }
    return NextResponse.json({ valid: true });
  } catch {
    // Falha de rede — não invalida token por isso
    return NextResponse.json({ valid: true });
  }
}
