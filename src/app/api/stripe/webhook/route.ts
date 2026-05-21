import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

export const runtime = "nodejs";

// In-memory store for subscription updates (in production, use Redis/DB)
// Client polls this via /api/stripe/webhook/updates?customer_id=xxx
const recentUpdates: Map<string, { tier: string; timestamp: number }> = new Map();

function tierFromPrice(priceId: string): string {
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_PLUS) return "plus";
  return "free";
}

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "setup_intent.succeeded": {
      const si = event.data.object as Stripe.SetupIntent;
      console.log(`SetupIntent succeeded: ${si.id}, customer: ${si.customer}`);
      break;
    }
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      console.log(`Payment succeeded: ${pi.id}, amount: ${pi.amount}`);
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const priceId = sub.items.data[0]?.price?.id || "";
      const newTier = tierFromPrice(priceId);

      recentUpdates.set(customerId, { tier: newTier, timestamp: Date.now() });
      console.log(`Subscription ${event.type}: customer=${customerId}, tier=${newTier}`);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      recentUpdates.set(customerId, { tier: "free", timestamp: Date.now() });
      console.log(`Subscription deleted: customer=${customerId}, downgraded to free`);
      break;
    }
  }

  return NextResponse.json({ received: true });
}

// Polling endpoint for client to check tier updates
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customer_id");

  if (!customerId) {
    return NextResponse.json({ error: "customer_id required" }, { status: 400 });
  }

  const update = recentUpdates.get(customerId);
  if (update && Date.now() - update.timestamp < 60000) {
    recentUpdates.delete(customerId);
    return NextResponse.json({ updated: true, tier: update.tier });
  }

  return NextResponse.json({ updated: false });
}
