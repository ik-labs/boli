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
    <main className="min-h-dvh bg-gradient-to-b from-gray-950 to-gray-900 text-white px-6 py-8">
      <div className="max-w-lg mx-auto space-y-6">
        <header className="flex items-baseline justify-between">
          <h1 className="text-xl font-bold tracking-tight">Orders</h1>
          <Link href="/concierge" className="text-sm text-emerald-400 hover:underline">
            ← Concierge
          </Link>
        </header>

        {user && (
          <p className="text-sm text-gray-400">
            {user.name} · <span className="text-emerald-400 capitalize">{user.tier}</span> · {user.ordersUsed} this month
          </p>
        )}

        {orders.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🛒</p>
            <p className="text-gray-500">No orders found in this browser.</p>
            <p className="text-sm text-gray-600 mt-1">Orders are stored locally. Place an order via voice to see it here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => (
              <div key={order.id} className="p-4 bg-gray-800/50 border border-gray-800 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{order.item}</p>
                  <p className="text-xs text-gray-500">{order.merchant} · {order.eta}m · {new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-emerald-400">₹{order.price}</p>
                  <p className={`text-xs ${
                    order.status === "confirmed" ? "text-amber-400"
                    : order.status === "delivered" ? "text-emerald-400"
                    : "text-red-400"
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
