"use client";

/* Hallmark · pre-emit critique: P4 H4 E4 S4 R5 V4 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import type { Tier } from "@/types";

const TIERS: { id: Tier; name: string; price: string; note: string }[] = [
  { id: "free", name: "Free", price: "₹0", note: "3 orders / month" },
  { id: "plus", name: "Plus", price: "₹299", note: "Unlimited · premium voice" },
  { id: "pro", name: "Pro", price: "₹599", note: "Unlimited · multilingual · patterns" },
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
      } catch { /* continue */ }
    }
    await db.users.add({
      id: userId, name: form.name, email: form.email, tier,
      ordersUsed: 0, ordersResetAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      stripeCustomerId, createdAt: new Date().toISOString(),
    });
    localStorage.setItem("boli_user_id", userId);
    router.push("/concierge");
  };

  return (
    <main className="min-h-dvh bg-[oklch(10%_0.01_160)] text-[oklch(94%_0.005_160)] flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Boli<span className="text-[oklch(72%_0.19_160)]">.</span>
          </h1>
          <p className="text-xs text-[oklch(45%_0.005_160)] mt-1">
            {step === 1 ? "Your details" : "Choose a plan"}
          </p>
        </div>

        {/* Progress */}
        <div className="flex gap-1.5">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-0.5 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-[oklch(72%_0.19_160)]" : "bg-[oklch(22%_0.01_160)]"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            {[
              { key: "name", type: "text", placeholder: "Name" },
              { key: "email", type: "email", placeholder: "Email" },
              { key: "address", type: "text", placeholder: "Delivery address" },
            ].map((f) => (
              <input
                key={f.key}
                type={f.type}
                placeholder={f.placeholder}
                value={form[f.key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="w-full px-4 py-3 bg-[oklch(14%_0.01_160)] border border-[oklch(22%_0.01_160)] rounded-lg text-sm placeholder:text-[oklch(35%_0.005_160)] focus:outline-none focus:border-[oklch(72%_0.19_160)] transition-colors"
              />
            ))}
            <button
              onClick={() => setStep(2)}
              disabled={!form.name || !form.email}
              className="w-full py-3 bg-[oklch(72%_0.19_160)] text-[oklch(10%_0.01_160)] text-sm font-medium rounded-full disabled:opacity-30 transition-opacity"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            {TIERS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTier(t.id)}
                className={`w-full p-4 rounded-lg border text-left transition-all ${
                  tier === t.id
                    ? "border-[oklch(72%_0.19_160)] bg-[oklch(72%_0.19_160)/6%]"
                    : "border-[oklch(22%_0.01_160)] hover:border-[oklch(30%_0.01_160)]"
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium">{t.name}</span>
                  <span className="text-xs text-[oklch(72%_0.19_160)]">{t.price}/mo</span>
                </div>
                <p className="text-xs text-[oklch(50%_0.005_160)] mt-1">{t.note}</p>
              </button>
            ))}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 border border-[oklch(22%_0.01_160)] text-sm rounded-full hover:border-[oklch(35%_0.01_160)] transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-[2] py-3 bg-[oklch(72%_0.19_160)] text-[oklch(10%_0.01_160)] text-sm font-medium rounded-full disabled:opacity-50 transition-opacity"
              >
                {loading ? "Setting up…" : "Start →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
