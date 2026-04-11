import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

export async function hasActiveSubscription(customerId: string): Promise<boolean> {
  try {
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    return subs.data.length > 0;
  } catch {
    return false;
  }
}
