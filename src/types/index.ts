export type Tier = "free" | "plus" | "pro";

export interface User {
  id: string;
  name: string;
  email: string;
  tier: Tier;
  ordersUsed: number;
  ordersResetAt: string; // ISO date
  stripeCustomerId?: string;
  paymentMethodId?: string;
  createdAt: string;
}

export interface UsualItem {
  id?: number;
  userId: string;
  name: string;
  category: string;
  preferredMerchant?: string;
}

export interface Order {
  id?: number;
  userId: string;
  item: string;
  merchant: string;
  price: number;
  eta: number; // minutes
  status: "confirmed" | "delivered" | "cancelled";
  stripePaymentIntentId: string;
  consentTranscript: string;
  createdAt: string;
}

export interface ConsentLog {
  id?: number;
  userId: string;
  orderId?: number;
  action: "order" | "upgrade";
  transcript: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  inStock: boolean;
  eta: number; // minutes
}

export interface MerchantCatalog {
  merchant: string;
  merchantId: string;
  products: Product[];
}
