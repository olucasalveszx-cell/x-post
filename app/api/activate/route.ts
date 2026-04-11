import { NextRequest, NextResponse } from "next/server";
import { isEmailActive } from "@/lib/kv";
import { createToken, verifyToken } from "@/lib/activation";

export async function POST(req: NextRequest) {
  const { email, token } = await req.json();

  // Verifica token existente (já ativado antes)
  if (token) {
    const { valid, email: tokenEmail } = verifyToken(token);
    return NextResponse.json({ valid, email: tokenEmail });
  }

  // Verifica via email no Redis
  if (!email) return NextResponse.json({ valid: false, error: "email obrigatório" }, { status: 400 });

  const active = await isEmailActive(email);
  if (!active) return NextResponse.json({ valid: false, error: "Email não encontrado. Verifique se usou o mesmo email da compra." });

  const newToken = createToken(email);
  return NextResponse.json({ valid: true, token: newToken, email });
}
