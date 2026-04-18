import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { addBonusCredits } from "@/lib/credits";

const REST_URL   = process.env.UPSTASH_REDIS_REST_URL!;
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

async function redis(cmd: string[]) {
  const res = await fetch(`${REST_URL}/${cmd.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${REST_TOKEN}` },
  });
  return res.json();
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { sessionId } = await req.json() as { sessionId: string };
  if (!sessionId) return NextResponse.json({ error: "sessionId obrigatório" }, { status: 400 });

  const fulfilledKey = `fulfilled:stripe:${sessionId}`;
  const already = await redis(["get", fulfilledKey]);
  if (already.result) return NextResponse.json({ ok: true, alreadyDone: true });

  const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
  if (checkoutSession.payment_status !== "paid") {
    return NextResponse.json({ error: "Pagamento não confirmado" }, { status: 402 });
  }
  if (checkoutSession.metadata?.type !== "credit_pack") {
    return NextResponse.json({ error: "Sessão inválida" }, { status: 400 });
  }
  if (checkoutSession.metadata?.email !== email) {
    return NextResponse.json({ error: "E-mail não corresponde" }, { status: 403 });
  }

  const credits = parseInt(checkoutSession.metadata?.credits ?? "0");
  if (!credits) return NextResponse.json({ error: "Créditos inválidos" }, { status: 400 });

  await addBonusCredits(email, credits);
  await redis(["set", fulfilledKey, "1", "ex", String(7 * 24 * 60 * 60)]);

  return NextResponse.json({ ok: true, credits });
}
