import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/adminAuth";
import { addBonusCredits, getCreditsInfo } from "@/lib/credits";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value ?? "";
  if (!verifyAdminToken(token)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { email, amount } = await req.json();
  if (!email || !amount) return NextResponse.json({ error: "email e amount obrigatórios" }, { status: 400 });

  await addBonusCredits(email.toLowerCase().trim(), Number(amount));
  const info = await getCreditsInfo(email.toLowerCase().trim());
  return NextResponse.json({ ok: true, email, added: amount, info });
}
