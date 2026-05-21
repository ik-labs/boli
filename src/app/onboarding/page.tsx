"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import type { Tier } from "@/types";

const TIERS: { id: Tier; name: string; price: string; note: string }[] = [
  { id: "free", name: "Free", price: "₹0", note: "3 orders / month · standard voice" },
  { id: "plus", name: "Plus", price: "₹299", note: "Unlimited orders · premium voice" },
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
    <main className="min-h-dvh bg-gradient-to-b from-gray-950 to-gray-900 text-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Boli<span className="text-emerald-400">.</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {step === 1 ? "Enter your details" : "Choose a plan"}
          </p>
        </div>

        {/* Progress */}
        <div className="flex gap-2">
          {[1, 2].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? "bg-emerald-500" : "bg-gray-800"}`} />
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
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            ))}
            <button
              onClick={() => setStep(2)}
              disabled={!form.name || !form.email}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-gray-950 text-sm font-semibold rounded-full disabled:opacity-30 disabled:hover:bg-emerald-500 transition-colors"
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
                className={`w-full p-4 rounded-xl border text-left transition-all ${
                  tier === t.id
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold">{t.name}</span>
                  <span className="text-xs font-medium text-emerald-400">{t.price}/mo</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{t.note}</p>
              </button>
            ))}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 border border-gray-700 hover:border-gray-500 text-sm rounded-full transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-[2] py-3 bg-emerald-500 hover:bg-emerald-400 text-gray-950 text-sm font-semibold rounded-full disabled:opacity-50 transition-colors"
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
