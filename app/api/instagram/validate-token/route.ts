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
      console.log("[ig/validate]", data.error.code, data.error.message);
      return NextResponse.json({ valid: false, code: data.error.code });
    }
    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json({ valid: false });
  }
}
