import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const { customerId } = await req.json();
  if (!customerId) return NextResponse.json({ error: "customerId obrigatório" }, { status: 400 });

  const origin = req.headers.get("origin") ?? "https://xpostzone.com";

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/editor`,
  });

  return NextResponse.json({ url: session.url });
}
