import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get("origin") ?? "https://xpostzone.com";

    console.log("[checkout] STRIPE_PRICE_ID:", process.env.STRIPE_PRICE_ID);
    console.log("[checkout] origin:", origin);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      locale: "pt-BR",
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/editor`,
      payment_method_types: ["card"],
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("[checkout] erro:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
