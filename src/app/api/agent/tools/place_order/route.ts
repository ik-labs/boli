import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { TIER_LIMITS } from "@/lib/tier";
import type { Tier } from "@/types";

const CONNECT_ACCOUNTS: Record<string, string | undefined> = {
  zepto: process.env.STRIPE_CONNECT_ZEPTO,
  blinkit: process.env.STRIPE_CONNECT_BLINKIT,
  bigbasket: process.env.STRIPE_CONNECT_BIGBASKET,
};

const CONSENT_REGEX = /\b(yes|yep|yeah|sure|confirm|go ahead|place it|do it|proceed|order|haan|theek hai|okay|ok|alright)\b/i;

export async function POST(req: Request) {
  const body = await req.json();
  console.log("place_order received:", JSON.stringify(body));
  const {
    customer_id,
    payment_method_id,
    merchant,
    product,
    price,
    consent_transcript,
    tier = "free",
    orders_used = 0,
  } = body;

  // Enforce tier limits — skip if paid user (has real payment method or paid tier)
  const isPaidTier = tier === "plus" || tier === "pro";
  const hasPaidPaymentMethod = !!payment_method_id && payment_method_id !== "";
  const limit = TIER_LIMITS[tier as Tier] ?? 3;
  if (!isPaidTier && !hasPaidPaymentMethod && orders_used >= limit) {
    return NextResponse.json({
      success: false,
      error: "limit_reached",
      message: `You've used all ${limit} free orders this month. Would you like to upgrade to Boli Plus for unlimited orders at just ₹299/month?`,
      orders_used,
      limit,
    });
  }

  // Validate consent
  if (!consent_transcript || !CONSENT_REGEX.test(consent_transcript)) {
    return NextResponse.json({
      success: false,
      error: "Voice consent not detected. Please confirm the order verbally.",
    });
  }

  // Use demo Stripe customer/PM as fallback for testing
  const stripeCustomerId = customer_id || "cus_UYWFIwMeBLpj4S";
  const stripePaymentMethod = payment_method_id || "pm_1TZPCrJN6I8YZAQLhasSjhF4";

  // Real payment flow
  const amountInPaise = Math.round(price * 100);
  const connectAccount = CONNECT_ACCOUNTS[merchant?.toLowerCase()];

  try {
    const paymentParams: Record<string, unknown> = {
      amount: amountInPaise,
      currency: "inr",
      customer: stripeCustomerId,
      payment_method: stripePaymentMethod,
      off_session: true,
      confirm: true,
      description: `Boli order: ${product} from ${merchant}`,
      shipping: {
        name: "Boli User",
        address: { line1: "123 Demo Street", city: "Mumbai", country: "IN", postal_code: "400001" },
      },
      metadata: { product, merchant, consent: consent_transcript.slice(0, 200) },
    };

    if (connectAccount) {
      paymentParams.application_fee_amount = Math.round(amountInPaise * 0.025);
      paymentParams.transfer_data = { destination: connectAccount };
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentParams as unknown as Parameters<typeof stripe.paymentIntents.create>[0]);

    return NextResponse.json({
      success: true,
      order_id: paymentIntent.id,
      amount: price,
      merchant,
      product,
      orders_used: orders_used + 1,
      message: `Order confirmed! ₹${price} for ${product} from ${merchant}. Arriving soon.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Payment failed";
    return NextResponse.json({ success: false, error: message });
  }
}
