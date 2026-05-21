import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { TIER_LIMITS } from "@/lib/tier";
import type { Tier } from "@/types";

const CONNECT_ACCOUNTS: Record<string, string | undefined> = {
  zepto: process.env.STRIPE_CONNECT_ZEPTO,
  blinkit: process.env.STRIPE_CONNECT_BLINKIT,
  bigbasket: process.env.STRIPE_CONNECT_BIGBASKET,
};

const CONSENT_REGEX = /\b(yes|confirm|go ahead|place it|do it|haan|theek hai|okay)\b/i;

export async function POST(req: Request) {
  const body = await req.json();
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

  // Enforce tier limits
  const limit = TIER_LIMITS[tier as Tier] ?? 3;
  if (orders_used >= limit) {
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

  const connectAccount = CONNECT_ACCOUNTS[merchant?.toLowerCase()];

  if (!customer_id || !payment_method_id) {
    return NextResponse.json({
      success: false,
      error: "No saved payment method. Please complete onboarding first.",
    });
  }

  const amountInPaise = Math.round(price * 100);

  try {
    // In production, this would use Connect with transfer_data
    // For demo, we create a direct PaymentIntent
    const paymentParams: Record<string, unknown> = {
      amount: amountInPaise,
      currency: "inr",
      customer: customer_id,
      payment_method: payment_method_id,
      off_session: true,
      confirm: true,
      metadata: { product, merchant, consent: consent_transcript.slice(0, 200) },
    };

    // Only add Connect params if account is configured
    if (connectAccount) {
      const applicationFee = Math.round(amountInPaise * 0.025);
      paymentParams.application_fee_amount = applicationFee;
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
