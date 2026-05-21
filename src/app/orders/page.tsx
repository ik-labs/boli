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
    db.orders
      .where("userId")
      .equals(userId)
      .reverse()
      .sortBy("createdAt")
      .then(setOrders);
  }, []);

  return (
    <main className="min-h-dvh bg-slate-900 text-white px-5 py-8">
      <div className="max-w-lg mx-auto space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h1 className="text-xl sm:text-2xl font-bold">Order History</h1>
          <Link
            href="/concierge"
            className="text-sm text-emerald-400 hover:underline active:text-emerald-300"
          >
            ← Back to Concierge
          </Link>
        </div>

        {user && (
          <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
            <span className="text-sm text-slate-400">
              {user.name} •{" "}
              <span className="capitalize text-emerald-400">{user.tier}</span> tier
              • {user.ordersUsed} orders this month
            </span>
          </div>
        )}

        {orders.length === 0 ? (
          <p className="text-slate-500 text-center py-12">
            No orders yet. Start a conversation to place your first order!
          </p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="p-4 bg-slate-800 rounded-lg border border-slate-700"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{order.item}</p>
                    <p className="text-sm text-slate-400">
                      {order.merchant} • {order.eta} min ETA
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-emerald-400">₹{order.price}</p>
                    <p
                      className={`text-xs ${
                        order.status === "confirmed"
                          ? "text-amber-400"
                          : order.status === "delivered"
                            ? "text-emerald-400"
                            : "text-red-400"
                      }`}
                    >
                      {order.status}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
