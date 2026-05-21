"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  ConversationProvider,
  useConversationControls,
  useConversationStatus,
} from "@elevenlabs/react";
import { db } from "@/lib/db";
import { ordersRemaining } from "@/lib/tier";
import type { User } from "@/types";
import Link from "next/link";
import { Orb } from "@/components/ui/orb";
import type { AgentState } from "@/components/ui/orb";

interface Message {
  role: "agent" | "user" | "system";
  text: string;
}

interface Activity {
  type: "tool_call" | "tool_result" | "status";
  label: string;
  detail?: string;
  timestamp: number;
}

function ConciergeInner() {
  const { startSession, endSession } = useConversationControls();
  const { status } = useConversationStatus();
  const [messages, setMessages] = useState<Message[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [upgraded, setUpgraded] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userId = localStorage.getItem("boli_user_id");
    if (userId) {
      db.users.get(userId).then((u) => u && setUser(u));
    }
  }, []);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  const startPolling = useCallback((customerId: string) => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/stripe/webhook?customer_id=${customerId}`);
      const data = await res.json();
      if (data.updated && user) {
        await db.users.update(user.id, { tier: data.tier });
        setUser({ ...user, tier: data.tier as User["tier"] });
        setUpgraded(true);
        setMessages((prev) => [...prev, { role: "system", text: `Upgraded to ${data.tier}! Reconnecting with premium voice…` }]);
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        endSession();
        setTimeout(async () => {
          const urlRes = await fetch(`/api/agent/signed-url?tier=${data.tier}`);
          const { signedUrl } = await urlRes.json();
          if (signedUrl) startSession({ signedUrl });
        }, 1000);
      }
    }, 3000);
  }, [user, endSession, startSession]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const handleToggle = useCallback(async () => {
    if (status === "connected") { endSession(); return; }
    // Read fresh from DB for correct agent selection
    const userId = localStorage.getItem("boli_user_id");
    const freshUser = userId ? await db.users.get(userId) : null;
    if (freshUser) setUser(freshUser);
    const currentTier = freshUser?.tier || "free";
    const res = await fetch(`/api/agent/signed-url?tier=${currentTier}`);
    const { signedUrl } = await res.json();
    if (signedUrl) {
      startSession({
        signedUrl,
        clientTools: {
          get_user_context: async () => {
            // Always read fresh from DB to get latest tier/orders
            const userId = localStorage.getItem("boli_user_id");
            const freshUser = userId ? await db.users.get(userId) : null;
            if (freshUser) setUser(freshUser);
            const u = freshUser || user;
            return JSON.stringify({
              userId: u?.id || "demo",
              tier: u?.tier || "free",
              ordersUsed: u?.ordersUsed || 0,
              ordersRemaining: ordersRemaining(u?.tier || "free", u?.ordersUsed || 0),
              name: u?.name || "Guest",
              customerId: u?.stripeCustomerId || "",
              paymentMethodId: u?.paymentMethodId || "",
            });
          },
        },
        onMessage: (msg) => {
          setMessages((prev) => [...prev, { role: "agent", text: msg.message }]);
          setIsSpeaking(true);
          setTimeout(() => setIsSpeaking(false), 1500);
          // Read fresh for polling trigger
          if (msg.message.toLowerCase().includes("upgrad")) {
            const uid = localStorage.getItem("boli_user_id");
            if (uid) db.users.get(uid).then(u => {
              if (u?.stripeCustomerId) startPolling(u.stripeCustomerId);
            });
          }
        },
        onModeChange: (mode) => setIsSpeaking(mode.mode === "speaking"),
        onStatusChange: (s) => { if (s.status === "disconnected") setIsSpeaking(false); },
        onAgentToolRequest: (tool) => {
          const labels: Record<string, string> = {
            search_products: "🔍 Searching merchants…",
            place_order: "💳 Processing payment…",
            upgrade_plan: "⬆️ Creating subscription…",
            get_user_context: "👤 Loading your profile…",
          };
          setActivities((prev) => [...prev, {
            type: "tool_call",
            label: labels[tool.tool_name] || `⚙️ ${tool.tool_name}`,
            timestamp: Date.now(),
          }]);
        },
        onAgentToolResponse: async (tool) => {
          const labels: Record<string, string> = {
            search_products: "✅ Found results across 3 merchants",
            place_order: "✅ Order confirmed via Stripe",
            upgrade_plan: "✅ Subscription activated",
            get_user_context: "✅ Profile loaded",
          };
          setActivities((prev) => [...prev, {
            type: "tool_result",
            label: labels[tool.tool_name] || `✅ ${tool.tool_name} done`,
            timestamp: Date.now(),
          }]);

          // Handle: update local state on successful order/upgrade
          if (tool.tool_name === "place_order") {
            try {
              const res = typeof (tool as unknown as Record<string, unknown>).result === "string"
                ? JSON.parse((tool as unknown as Record<string, unknown>).result as string)
                : (tool as unknown as Record<string, unknown>).result;
              if (res?.success) {
                const uid = localStorage.getItem("boli_user_id");
                if (uid) {
                  const u = await db.users.get(uid);
                  if (u) {
                    const newUsed = (u.ordersUsed || 0) + 1;
                    await db.users.update(uid, { ordersUsed: newUsed });
                    setUser({ ...u, ordersUsed: newUsed });
                    await db.orders.add({
                      userId: uid, item: res.product || "Item", merchant: res.merchant || "Merchant",
                      price: res.amount || 0, eta: 12, status: "confirmed",
                      stripePaymentIntentId: res.order_id || "", consentTranscript: "",
                      createdAt: new Date().toISOString(),
                    });
                  }
                }
                // Show success card
                setMessages((prev) => [...prev, {
                  role: "system",
                  text: `✅ Payment Successful\n💳 ₹${res.amount} charged via Stripe\n🏪 ${res.merchant}\n📦 ${res.product}\n🆔 ${(res.order_id || "").slice(0, 20)}…`,
                }]);
              }
            } catch { /* ignore parse errors */ }
          }
          if (tool.tool_name === "upgrade_plan") {
            try {
              const res = typeof (tool as unknown as Record<string, unknown>).result === "string"
                ? JSON.parse((tool as unknown as Record<string, unknown>).result as string)
                : (tool as unknown as Record<string, unknown>).result;
              if (res?.success) {
                const newTier = (res.plan || "plus") as User["tier"];
                const uid = localStorage.getItem("boli_user_id");
                if (uid) {
                  await db.users.update(uid, { tier: newTier, ordersUsed: 0 });
                  const u = await db.users.get(uid);
                  if (u) setUser(u);
                }
                setUpgraded(true);
                setMessages((prev) => [...prev, { role: "system", text: `✅ Subscription Activated\n⬆️ Upgraded to Boli ${newTier.charAt(0).toUpperCase() + newTier.slice(1)}\n♾️ Unlimited orders\n🎙️ Premium voice enabled` }]);
                endSession();
                setTimeout(async () => {
                  const urlRes = await fetch(`/api/agent/signed-url?tier=${newTier}`);
                  const { signedUrl } = await urlRes.json();
                  if (signedUrl) startSession({ signedUrl });
                }, 1500);
              }
            } catch { /* ignore */ }
          }
        },
      });
    }
  }, [status, user, startSession, endSession, startPolling]);

  const remaining = ordersRemaining(user?.tier || "free", user?.ordersUsed || 0);
  const isActive = status === "connected";

  return (
    <main className="min-h-dvh bg-gradient-to-b from-gray-950 to-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="px-6 pt-5 pb-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Boli<span className="text-emerald-400">.</span>
        </Link>
        {user && (
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
              user.tier === "pro" ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
              : user.tier === "plus" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              : "bg-gray-700/50 text-gray-400 border border-gray-600"
            }`}>
              {user.tier === "free" ? "Free" : user.tier === "plus" ? "Plus ✦" : "Pro ✦"}
            </span>
            <span className="text-xs text-gray-500">
              {user.tier === "free"
                ? `${remaining}/${3} orders left`
                : "Unlimited orders"}
            </span>
          </div>
        )}
      </header>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5">
        {upgraded && (
          <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-sm text-emerald-400 animate-pulse">
            ✦ Premium voice activated
          </div>
        )}

        {/* Orb */}
        <button
          onClick={handleToggle}
          className="relative w-44 h-44 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          aria-label={isActive ? "End conversation" : "Start conversation"}
        >
          <div className="w-full h-full rounded-full bg-gray-800/50 border border-gray-700/50 p-2 shadow-xl">
            <div className="w-full h-full rounded-full overflow-hidden">
              <Orb
                colors={isActive ? ["#6ee7b7", "#34d399"] : ["#d1d5db", "#9ca3af"]}
                agentState={
                  (status === "connected"
                    ? isSpeaking ? "talking" : "listening"
                    : status === "connecting" ? "thinking" : null) as AgentState
                }
              />
            </div>
          </div>
        </button>

        {/* Status text */}
        <p className={`text-sm ${isActive ? "text-emerald-400" : "text-gray-500"}`}>
          {status === "disconnected" && "Tap to start talking"}
          {status === "connecting" && "Connecting…"}
          {status === "connected" && (isSpeaking ? "Boli is speaking…" : "Listening — say something!")}
        </p>

        {/* Suggestions when idle */}
        {status === "disconnected" && messages.length === 0 && (
          <div className="mt-4 text-center space-y-2">
            <p className="text-xs text-gray-500">Try saying:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {["Reorder my usual atta", "Find me cheap milk", "Order some dal"].map((s) => (
                <span key={s} className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-full text-xs text-gray-300">
                  &ldquo;{s}&rdquo;
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Transcript */}
      {messages.length > 0 && (
        <div
          ref={transcriptRef}
          className="max-h-[35vh] overflow-y-auto px-6 pb-4 space-y-2"
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`text-sm px-4 py-2.5 rounded-xl whitespace-pre-line ${
                msg.role === "agent"
                  ? "bg-gray-800 text-gray-200 mr-12"
                  : msg.role === "system" && msg.text.includes("Payment Successful")
                    ? "bg-emerald-950/50 border border-emerald-500/30 text-emerald-200 text-xs leading-relaxed"
                    : msg.role === "system" && msg.text.includes("Upgraded")
                      ? "bg-purple-950/50 border border-purple-500/30 text-purple-200 text-xs leading-relaxed"
                      : msg.role === "system"
                        ? "text-center text-xs text-emerald-400 py-1"
                        : "bg-emerald-900/30 text-emerald-100 ml-12"
              }`}
            >
              {msg.text}
            </div>
          ))}
        </div>
      )}

      {/* Activity feed — shows tool calls under the hood */}
      {activities.length > 0 && (
        <div className="px-6 pb-3">
          <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-2">Under the hood</p>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {activities.slice(-6).map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  a.type === "tool_call" ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
                }`} />
                <span className="text-gray-400">{a.label}</span>
                <span className="text-gray-600 ml-auto text-[10px]">
                  {new Date(a.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer nav */}
      <nav className="px-6 py-4 border-t border-gray-800 flex justify-center gap-8 text-sm text-gray-500">
        <Link href="/orders" className="hover:text-white transition-colors">Orders</Link>
        <Link href="/onboarding" className="hover:text-white transition-colors">Settings</Link>
      </nav>
    </main>
  );
}

export default function ConciergePage() {
  return (
    <ConversationProvider onError={(e) => console.error("Conversation error:", e)}>
      <ConciergeInner />
    </ConversationProvider>
  );
}
