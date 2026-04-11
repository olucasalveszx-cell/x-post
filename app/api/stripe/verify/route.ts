import { NextRequest, NextResponse } from "next/server";
import { stripe, hasActiveSubscription } from "@/lib/stripe";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  const customerId = req.nextUrl.searchParams.get("customer_id");

  // Verifica via session_id (após checkout)
  if (sessionId) {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session.customer) return NextResponse.json({ active: false });

    const cid = session.customer as string;
    const active = await hasActiveSubscription(cid);
    const customer = await stripe.customers.retrieve(cid) as any;

    return NextResponse.json({ active, customerId: cid, email: customer.email });
  }

  // Verifica via customer_id (já logado)
  if (customerId) {
    const active = await hasActiveSubscription(customerId);
    return NextResponse.json({ active });
  }

  return NextResponse.json({ active: false });
}
