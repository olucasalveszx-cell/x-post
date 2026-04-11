import { NextRequest, NextResponse } from "next/server";
import { checkAdminCredentials, createAdminToken, ADMIN_COOKIE } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}));

  if (!email || !password) {
    return NextResponse.json({ error: "Preencha todos os campos." }, { status: 400 });
  }

  if (!checkAdminCredentials(email, password)) {
    return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
  }

  const token = createAdminToken();
  const res   = NextResponse.json({ ok: true });

  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:     "/",
    maxAge:   8 * 60 * 60, // 8h
  });

  return res;
}
