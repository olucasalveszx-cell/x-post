import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { CREDIT_PACKS, type CreditPackId } from "@/lib/credits";

export const maxDuration = 15;

const PACK_PRICE_IDS: Record<CreditPackId, string | undefined> = {
  "10":  process.env.STRIPE_PRICE_CREDITS_10,
  "25":  process.env.STRIPE_PRICE_CREDITS_25,
  "50":  process.env.STRIPE_PRICE_CREDITS_50,
  "100": process.env.STRIPE_PRICE_CREDITS_100,
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { packId } = await req.json() as { packId: CreditPackId };
  const pack = CREDIT_PACKS.find((p) => p.id === packId);
  if (!pack) return NextResponse.json({ error: "Pacote inválido" }, { status: 400 });

  const priceId = PACK_PRICE_IDS[packId];
  if (!priceId) {
    return NextResponse.json(
      { error: `Price ID para o pacote ${packId} não configurado. Adicione STRIPE_PRICE_CREDITS_${packId} no .env.` },
      { status: 500 }
    );
  }

  const origin = req.headers.get("origin") ?? "https://xpostzone.com";

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    locale: "pt-BR",
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { type: "credit_pack", email, credits: String(pack.credits) },
    success_url: `${origin}/credits?success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/credits`,
    payment_method_types: ["card"],
  });

  return NextResponse.json({ url: checkoutSession.url });
}
