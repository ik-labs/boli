import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    const { email, name } = await req.json();

    const customer = await stripe.customers.create({ email, name });

    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ["card"],
    });

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId: customer.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create setup intent";
    console.error("Setup intent error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
