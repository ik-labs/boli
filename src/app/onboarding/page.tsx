"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import type { Tier } from "@/types";

const TIERS: { id: Tier; name: string; price: string; features: string[] }[] = [
  { id: "free", name: "Free", price: "₹0/mo", features: ["3 orders/month", "Standard voice", "Price comparison"] },
  { id: "plus", name: "Plus", price: "₹299/mo", features: ["Unlimited orders", "Premium voice", "Priority support"] },
  { id: "pro", name: "Pro", price: "₹599/mo", features: ["Unlimited orders", "Premium multilingual voice", "Pattern learning", "Priority support"] },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", email: "", address: "" });
  const [tier, setTier] = useState<Tier>("free");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const userId = crypto.randomUUID();

    // Create Stripe customer if paid tier
    let stripeCustomerId: string | undefined;
    if (tier !== "free") {
      try {
        const res = await fetch("/api/stripe/setup-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email, name: form.name }),
        });
        const data = await res.json();
        stripeCustomerId = data.customerId;
      } catch {
        // Continue without Stripe for now
      }
    }

    await db.users.add({
      id: userId,
      name: form.name,
      email: form.email,
      tier,
      ordersUsed: 0,
      ordersResetAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      stripeCustomerId,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("boli_user_id", userId);
    router.push("/concierge");
  };

  return (
    <main className="min-h-dvh flex items-center justify-center px-5 py-8 bg-slate-900 text-white">
      <div className="w-full max-w-md space-y-5">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold">
            Boli<span className="text-emerald-400">.</span>
          </h1>
          <p className="text-slate-400 mt-2 text-sm">Set up your voice concierge</p>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-emerald-500" : "bg-slate-700"
              }`}
            />
          ))}
        </div>

        {/* Step 1: User info */}
        {step === 1 && (
          <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
            <label className="block text-sm text-slate-400">Your details</label>
            <input
              type="text"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <input
              type="text"
              placeholder="Delivery address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <button
              onClick={() => setStep(2)}
              disabled={!form.name || !form.email}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg font-medium transition-all"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Tier selection */}
        {step === 2 && (
          <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
            <label className="block text-sm text-slate-400">Choose your plan</label>
            {TIERS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTier(t.id)}
                className={`w-full p-4 rounded-lg border text-left transition-all ${
                  tier === t.id
                    ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/5"
                    : "border-slate-700 bg-slate-800 hover:border-slate-600"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold">{t.name}</span>
                  <span className="text-sm font-medium text-emerald-400">{t.price}</span>
                </div>
                <ul className="mt-2 text-xs text-slate-400 space-y-1">
                  {t.features.map((f) => (
                    <li key={f}>✓ {f}</li>
                  ))}
                </ul>
              </button>
            ))}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 border border-slate-700 hover:border-slate-600 rounded-lg font-medium transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-2 py-3 px-6 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 rounded-lg font-medium transition-all"
              >
                {loading ? "Setting up..." : "Start Ordering →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
