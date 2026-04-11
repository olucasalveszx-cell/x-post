import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "https://xpostzone.com";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    locale: "pt-BR",
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/editor`,
    payment_method_types: ["card"],
  });

  return NextResponse.json({ url: session.url });
}
