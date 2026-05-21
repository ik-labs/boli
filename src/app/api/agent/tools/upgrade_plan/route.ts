import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

const PRICE_IDS: Record<string, string | undefined> = {
  plus: process.env.STRIPE_PRICE_PLUS,
  pro: process.env.STRIPE_PRICE_PRO,
};

const CONSENT_REGEX = /\b(yes|confirm|upgrade|go ahead|do it|haan|theek hai|okay)\b/i;

export async function POST(req: Request) {
  const body = await req.json();
  const { customer_id, payment_method_id, plan, consent_transcript } = body;

  if (!consent_transcript || !CONSENT_REGEX.test(consent_transcript)) {
    return NextResponse.json({
      success: false,
      error: "Voice consent not detected. Please confirm the upgrade verbally.",
    });
  }

  const priceId = PRICE_IDS[plan?.toLowerCase()];
  if (!priceId) {
    return NextResponse.json({
      success: false,
      error: `Plan "${plan}" not available. Choose "plus" or "pro".`,
    });
  }

  if (!customer_id || !payment_method_id) {
    return NextResponse.json({
      success: false,
      error: "No saved payment method. Please complete onboarding first.",
    });
  }

  try {
    const subscription = await stripe.subscriptions.create({
      customer: customer_id,
      items: [{ price: priceId }],
      default_payment_method: payment_method_id,
      metadata: { plan, consent: consent_transcript.slice(0, 200) },
    });

    return NextResponse.json({
      success: true,
      subscription_id: subscription.id,
      plan,
      message: `Upgraded to Boli ${plan.charAt(0).toUpperCase() + plan.slice(1)}! Enjoy unlimited orders${plan === "pro" ? " and premium voice" : ""}.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upgrade failed";
    return NextResponse.json({ success: false, error: message });
  }
}
