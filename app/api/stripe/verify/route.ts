import { NextRequest, NextResponse } from "next/server";
import { stripe, hasActiveSubscription } from "@/lib/stripe";
import { isEmailActive } from "@/lib/kv";

export async function GET(req: NextRequest) {
  const sessionId  = req.nextUrl.searchParams.get("session_id");
  const customerId = req.nextUrl.searchParams.get("customer_id");
  const email      = req.nextUrl.searchParams.get("email");

  // Após checkout Stripe
  if (sessionId) {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session.customer) return NextResponse.json({ active: false });
    const cid = session.customer as string;
    const active = await hasActiveSubscription(cid);
    const customer = await stripe.customers.retrieve(cid) as any;
    return NextResponse.json({ active, customerId: cid, email: customer.email });
  }

  // Via customer_id Stripe
  if (customerId) {
    const active = await hasActiveSubscription(customerId);
    return NextResponse.json({ active });
  }

  // Via email (Google login) — verifica Kirvano KV + Stripe por email
  if (email) {
    // 0. Admin bypass
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    if (adminEmail && email.toLowerCase().trim() === adminEmail) {
      return NextResponse.json({ active: true, source: "admin" });
    }

    // 1. Verifica Kirvano
    const kirvanoActive = await isEmailActive(email).catch(() => false);
    if (kirvanoActive) return NextResponse.json({ active: true, source: "kirvano" });

    // 2. Verifica Stripe por email
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length > 0) {
      const active = await hasActiveSubscription(customers.data[0].id);
      return NextResponse.json({ active, customerId: customers.data[0].id, source: "stripe" });
    }

    return NextResponse.json({ active: false });
  }

  return NextResponse.json({ active: false });
}
