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
    const tier = user?.tier || "free";
    const res = await fetch(`/api/agent/signed-url?tier=${tier}`);
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
          if (user?.stripeCustomerId && msg.message.toLowerCase().includes("upgrad")) {
            startPolling(user.stripeCustomerId);
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
        onAgentToolResponse: (tool) => {
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

          // Handle demo mode: update local state on successful order/upgrade
          if (tool.tool_name === "place_order" && user) {
            try {
              const res = typeof (tool as unknown as Record<string, unknown>).result === "string"
                ? JSON.parse((tool as unknown as Record<string, unknown>).result as string)
                : (tool as unknown as Record<string, unknown>).result;
              if (res?.success) {
                const newUsed = (user.ordersUsed || 0) + 1;
                db.users.update(user.id, { ordersUsed: newUsed });
                setUser({ ...user, ordersUsed: newUsed });
                db.orders.add({
                  userId: user.id, item: res.product || "Item", merchant: res.merchant || "Merchant",
                  price: res.amount || 0, eta: 12, status: "confirmed",
                  stripePaymentIntentId: res.order_id || "", consentTranscript: "",
                  createdAt: new Date().toISOString(),
                });
              }
            } catch { /* ignore parse errors */ }
          }
          if (tool.tool_name === "upgrade_plan" && user) {
            try {
              const res = typeof (tool as unknown as Record<string, unknown>).result === "string"
                ? JSON.parse((tool as unknown as Record<string, unknown>).result as string)
                : (tool as unknown as Record<string, unknown>).result;
              if (res?.success) {
                const newTier = (res.plan || "plus") as User["tier"];
                db.users.update(user.id, { tier: newTier, ordersUsed: 0 });
                setUser({ ...user, tier: newTier, ordersUsed: 0 });
                setUpgraded(true);
                setMessages((prev) => [...prev, { role: "system", text: `🎉 Upgraded to ${newTier}! Premium voice activated.` }]);
                // Reconnect with premium agent
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
        <span className="text-sm text-gray-400">
          {user ? (
            <>
              {user.name} · <span className="text-emerald-400 capitalize">{user.tier}</span>
              {user.tier === "free" && ` · ${remaining} left`}
            </>
          ) : "Voice Concierge"}
        </span>
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
          className="relative flex items-center justify-center w-40 h-40 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 group"
          aria-label={isActive ? "End conversation" : "Start conversation"}
        >
          {/* Ripples when speaking */}
          {isActive && isSpeaking && (
            <>
              <span className="absolute inset-0 rounded-full bg-emerald-400/10 animate-ping" />
              <span className="absolute inset-4 rounded-full bg-emerald-400/10 animate-pulse" />
            </>
          )}
          {/* Breathing when connected idle */}
          {isActive && !isSpeaking && (
            <span className="absolute inset-4 rounded-full bg-emerald-400/5 animate-pulse" />
          )}
          {/* Connecting */}
          {status === "connecting" && (
            <span className="absolute inset-4 rounded-full border-2 border-gray-600 border-t-emerald-400 animate-spin" />
          )}
          {/* Core orb */}
          <span
            className={`relative w-28 h-28 rounded-full flex items-center justify-center text-4xl transition-all duration-300 shadow-2xl ${
              isActive
                ? isSpeaking
                  ? "bg-emerald-500 shadow-emerald-500/30 scale-105"
                  : "bg-emerald-600 shadow-emerald-600/20"
                : status === "connecting"
                  ? "bg-gray-700"
                  : "bg-gray-800 group-hover:bg-gray-700 shadow-gray-900/50"
            }`}
          >
            {isActive ? (isSpeaking ? "🗣️" : "🎙️") : status === "connecting" ? "⏳" : "🎤"}
          </span>
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
              className={`text-sm px-4 py-2.5 rounded-xl ${
                msg.role === "agent"
                  ? "bg-gray-800 text-gray-200 mr-12"
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
