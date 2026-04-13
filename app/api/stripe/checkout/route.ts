import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export const maxDuration = 30;

const PLAN_PRICE: Record<string, string | undefined> = {
  basic:    process.env.STRIPE_PRICE_BASIC,
  pro:      process.env.STRIPE_PRICE_PRO,
  business: process.env.STRIPE_PRICE_BUSINESS,
  // compatibilidade com planos antigos
  weekly:   process.env.STRIPE_PRICE_WEEKLY,
  monthly:  process.env.STRIPE_PRICE_MONTHLY ?? process.env.STRIPE_PRICE_ID,
  annual:   process.env.STRIPE_PRICE_ANNUAL,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const plan: string = body.plan ?? "monthly";
    const origin = req.headers.get("origin") ?? "https://xpostzone.com";

    const priceId = PLAN_PRICE[plan];
    if (!priceId) {
      return NextResponse.json(
        { error: `Price ID para o plano "${plan}" não configurado. Adicione STRIPE_PRICE_${plan.toUpperCase()} no .env.` },
        { status: 500 }
      );
    }

    console.log("[checkout] plan:", plan, "priceId:", priceId);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      locale: "pt-BR",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/#pricing`,
      payment_method_types: ["card"],
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("[checkout] erro:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
