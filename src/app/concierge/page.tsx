"use client";

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

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTo({
        top: transcriptRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  // Poll for tier upgrades after subscription
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
        setMessages((prev) => [
          ...prev,
          { role: "system", text: `🎉 Upgraded to ${data.tier}! Reconnecting with premium voice...` },
        ]);
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;

        // Reconnect with premium agent
        endSession();
        setTimeout(async () => {
          const urlRes = await fetch(`/api/agent/signed-url?tier=${data.tier}`);
          const { signedUrl } = await urlRes.json();
          if (signedUrl) {
            startSession({ signedUrl });
          }
        }, 1000);
      }
    }, 3000);
  }, [user, endSession, startSession]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleToggle = useCallback(async () => {
    if (status === "connected") {
      endSession();
      return;
    }

    const tier = user?.tier || "free";
    const res = await fetch(`/api/agent/signed-url?tier=${tier}`);
    const { signedUrl } = await res.json();

    if (signedUrl) {
      startSession({
        signedUrl,
        clientTools: {
          get_user_context: async () => {
            const remaining = ordersRemaining(
              user?.tier || "free",
              user?.ordersUsed || 0
            );
            return JSON.stringify({
              userId: user?.id || "demo",
              tier: user?.tier || "free",
              ordersUsed: user?.ordersUsed || 0,
              ordersRemaining: remaining,
              name: user?.name || "Guest",
              customerId: user?.stripeCustomerId || "",
              paymentMethodId: user?.paymentMethodId || "",
            });
          },
        },
        onMessage: (msg) => {
          setMessages((prev) => [...prev, { role: "agent", text: msg.message }]);
          setIsSpeaking(true);
          setTimeout(() => setIsSpeaking(false), 1500);

          // If agent mentions upgrade, start polling
          if (
            user?.stripeCustomerId &&
            msg.message.toLowerCase().includes("upgrad")
          ) {
            startPolling(user.stripeCustomerId);
          }
        },
        onModeChange: (mode) => {
          setIsSpeaking(mode.mode === "speaking");
        },
        onStatusChange: (s) => {
          if (s.status === "disconnected") setIsSpeaking(false);
        },
      });
    }
  }, [status, user, startSession, endSession, startPolling]);

  const remaining = ordersRemaining(user?.tier || "free", user?.ordersUsed || 0);

  return (
    <main className="min-h-dvh flex flex-col items-center justify-between px-5 py-8 bg-slate-900 text-white safe-area-inset">
      <div className="w-full max-w-md flex flex-col items-center flex-1 justify-center space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">
            Boli<span className="text-emerald-400">.</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {user ? (
              <>
                Hi {user.name} •{" "}
                <span className="capitalize text-emerald-400">{user.tier}</span>
                {user.tier === "free" && ` • ${remaining} orders left`}
              </>
            ) : (
              "Voice Concierge"
            )}
          </p>
        </div>

        {upgraded && (
          <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/50 rounded-lg text-sm text-emerald-300 animate-pulse">
            ✨ Premium voice activated!
          </div>
        )}

        <VoiceOrb
          status={status === "error" ? "disconnected" : status}
          isSpeaking={isSpeaking}
          onClick={handleToggle}
        />

        <p className="text-xs text-slate-500">
          {status === "disconnected" && "Tap to start talking"}
          {status === "connecting" && "Connecting..."}
          {status === "connected" && "Listening — say something!"}
        </p>

        {/* Transcript */}
        {messages.length > 0 && (
          <div
            ref={transcriptRef}
            className="max-h-60 overflow-y-auto space-y-2 text-left text-sm scroll-smooth"
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`px-3 py-2 rounded-lg ${
                  msg.role === "agent"
                    ? "bg-slate-800 text-slate-200"
                    : msg.role === "system"
                      ? "bg-emerald-900/40 text-emerald-300 text-center text-xs"
                      : "bg-emerald-900/30 text-emerald-200 ml-8"
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-4 justify-center pt-4 text-sm">
          <Link href="/orders" className="text-slate-400 hover:text-white active:text-emerald-400 py-2 px-3">
            Order History
          </Link>
          <Link href="/onboarding" className="text-slate-400 hover:text-white active:text-emerald-400 py-2 px-3">
            Settings
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function ConciergePage() {
  return (
    <ConversationProvider
      onError={(error) => console.error("Conversation error:", error)}
    >
      <ConciergeInner />
    </ConversationProvider>
  );
}
