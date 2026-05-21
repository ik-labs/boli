"use client";

/* Hallmark · pre-emit critique: P5 H4 E4 S4 R5 V4 */

import { useState, useCallback, useEffect, useRef } from "react";
import {
  ConversationProvider,
  useConversationControls,
  useConversationStatus,
} from "@elevenlabs/react";
import { VoiceOrb } from "@/components/VoiceOrb";
import { db } from "@/lib/db";
import { ordersRemaining } from "@/lib/tier";
import type { User } from "@/types";
import Link from "next/link";

interface Message {
  role: "agent" | "user" | "system";
  text: string;
}

function ConciergeInner() {
  const { startSession, endSession } = useConversationControls();
  const { status } = useConversationStatus();
  const [messages, setMessages] = useState<Message[]>([]);
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
        const newUser = { ...user, tier: data.tier as User["tier"] };
        await db.users.update(user.id, { tier: data.tier });
        setUser(newUser);
        setUpgraded(true);
        setMessages((prev) => [...prev, { role: "system", text: `Upgraded to ${data.tier}. Reconnecting with premium voice…` }]);
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
          get_user_context: async () => JSON.stringify({
            userId: user?.id || "demo",
            tier: user?.tier || "free",
            ordersUsed: user?.ordersUsed || 0,
            ordersRemaining: ordersRemaining(user?.tier || "free", user?.ordersUsed || 0),
            name: user?.name || "Guest",
            customerId: user?.stripeCustomerId || "",
            paymentMethodId: user?.paymentMethodId || "",
          }),
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
      });
    }
  }, [status, user, startSession, endSession, startPolling]);

  const remaining = ordersRemaining(user?.tier || "free", user?.ordersUsed || 0);

  return (
    <main className="min-h-dvh bg-[oklch(10%_0.01_160)] text-[oklch(94%_0.005_160)] flex flex-col">
      {/* Header */}
      <header className="px-5 pt-6 pb-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Boli<span className="text-[oklch(72%_0.19_160)]">.</span>
        </Link>
        <span className="text-xs text-[oklch(50%_0.005_160)]">
          {user ? (
            <>
              {user.name} · <span className="capitalize text-[oklch(72%_0.19_160)]">{user.tier}</span>
              {user.tier === "free" && ` · ${remaining} left`}
            </>
          ) : "Voice Concierge"}
        </span>
      </header>

      {/* Main content — centered orb */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 gap-6">
        {upgraded && (
          <p className="text-xs text-[oklch(72%_0.19_160)] font-medium animate-pulse">
            ✦ Premium voice activated
          </p>
        )}

        <VoiceOrb
          status={status === "error" ? "disconnected" : status}
          isSpeaking={isSpeaking}
          onClick={handleToggle}
        />

        <p className="text-xs text-[oklch(40%_0.005_160)]">
          {status === "disconnected" && "Tap to start"}
          {status === "connecting" && "Connecting…"}
          {status === "connected" && "Listening"}
        </p>
      </div>

      {/* Transcript */}
      {messages.length > 0 && (
        <div
          ref={transcriptRef}
          className="max-h-[40vh] overflow-y-auto px-5 pb-4 space-y-2 scroll-smooth"
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`text-sm px-3 py-2 rounded-lg ${
                msg.role === "agent"
                  ? "bg-[oklch(15%_0.01_160)] text-[oklch(80%_0.005_160)]"
                  : msg.role === "system"
                    ? "text-center text-xs text-[oklch(72%_0.19_160)]"
                    : "bg-[oklch(72%_0.19_160)/8%] text-[oklch(80%_0.005_160)] ml-8"
              }`}
            >
              {msg.text}
            </div>
          ))}
        </div>
      )}

      {/* Footer nav */}
      <nav className="px-5 py-4 border-t border-[oklch(18%_0.01_160)] flex justify-center gap-6 text-xs text-[oklch(40%_0.005_160)]">
        <Link href="/orders" className="hover:text-white transition-colors py-1">Orders</Link>
        <Link href="/onboarding" className="hover:text-white transition-colors py-1">Settings</Link>
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
