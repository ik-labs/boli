import type { Tier } from "@/types";

export const TIER_LIMITS: Record<Tier, number> = {
  free: 3,
  plus: Infinity,
  pro: Infinity,
};

export function canPlaceOrder(tier: Tier, ordersUsed: number): boolean {
  return ordersUsed < TIER_LIMITS[tier];
}

export function ordersRemaining(tier: Tier, ordersUsed: number): number {
  const limit = TIER_LIMITS[tier];
  if (limit === Infinity) return Infinity;
  return Math.max(0, limit - ordersUsed);
}

export function shouldResetUsage(resetAt: string): boolean {
  return new Date(resetAt) <= new Date();
}

export function nextResetDate(): string {
  return new Date(Date.now() + 30 * 86400000).toISOString();
}
