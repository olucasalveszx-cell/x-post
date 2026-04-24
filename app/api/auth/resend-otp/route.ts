import { NextResponse } from "next/server";
import { redisGet } from "@/lib/redis";
import { generateOTP, storeOTP } from "@/lib/otp";
import { sendOTPEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email obrigatório" }, { status: 400 });

    const emailNorm = email.toLowerCase().trim();
    const raw = await redisGet(`user:${emailNorm}`);
    if (!raw) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

    const userData = JSON.parse(raw);
    if (userData.verified) return NextResponse.json({ error: "Conta já verificada" }, { status: 400 });

    const code = generateOTP();
    await storeOTP(emailNorm, code);
    await sendOTPEmail(emailNorm, code);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
