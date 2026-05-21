"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import type { Order, User } from "@/types";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem("boli_user_id");
    if (!userId) return;
    db.users.get(userId).then((u) => u && setUser(u));
    db.orders.where("userId").equals(userId).reverse().sortBy("createdAt").then(setOrders);
  }, []);

  return (
    <main className="min-h-dvh bg-[oklch(10%_0.01_160)] text-[oklch(94%_0.005_160)] px-5 py-8">
      <div className="max-w-lg mx-auto space-y-6">
        <header className="flex items-baseline justify-between">
          <h1 className="text-xl font-bold tracking-tight">Orders</h1>
          <Link href="/concierge" className="text-xs text-[oklch(72%_0.19_160)] hover:underline">
            ← Concierge
          </Link>
        </header>

        {user && (
          <p className="text-xs text-[oklch(45%_0.005_160)]">
            {user.name} · <span className="capitalize text-[oklch(72%_0.19_160)]">{user.tier}</span> · {user.ordersUsed} this month
          </p>
        )}

        {orders.length === 0 ? (
          <p className="text-sm text-[oklch(40%_0.005_160)] text-center py-16">
            No orders yet. Start a conversation to place your first.
          </p>
        ) : (
          <div className="space-y-px bg-[oklch(18%_0.01_160)] rounded-lg overflow-hidden">
            {orders.map((order) => (
              <div key={order.id} className="bg-[oklch(12%_0.01_160)] p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{order.item}</p>
                  <p className="text-xs text-[oklch(45%_0.005_160)]">
                    {order.merchant} · {order.eta}m · {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-[oklch(72%_0.19_160)]">₹{order.price}</p>
                  <p className={`text-xs ${
                    order.status === "confirmed" ? "text-[oklch(75%_0.15_80)]"
                    : order.status === "delivered" ? "text-[oklch(72%_0.19_160)]"
                    : "text-[oklch(65%_0.2_25)]"
                  }`}>{order.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
