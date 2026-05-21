import { NextResponse } from "next/server";
import Fuse from "fuse.js";
import zepto from "@/data/zepto.json";
import blinkit from "@/data/blinkit.json";
import bigbasket from "@/data/bigbasket.json";
import type { Product } from "@/types";

interface SearchResult {
  product: string;
  merchant: string;
  price: number;
  unit: string;
  eta: number;
  inStock: boolean;
}

const catalogs = [zepto, blinkit, bigbasket];

const allProducts = catalogs.flatMap((c) =>
  c.products.map((p) => ({ ...p, merchant: c.merchant, merchantId: c.merchantId }))
);

const fuse = new Fuse(allProducts, {
  keys: ["name", "category"],
  threshold: 0.4,
  includeScore: true,
});

export async function POST(req: Request) {
  const body = await req.json();
  // ElevenLabs webhook sends tool params in body
  const query: string = body.query || body.search_query || "";

  if (!query) {
    return NextResponse.json({ results: [], message: "No query provided" });
  }

  const results = fuse.search(query);

  const inStock = results
    .map((r) => r.item)
    .filter((item) => item.inStock);

  // Sort by price, take top 3
  const top3: SearchResult[] = inStock
    .sort((a, b) => a.price - b.price)
    .slice(0, 3)
    .map((item) => ({
      product: item.name,
      merchant: item.merchant,
      price: item.price,
      unit: item.unit,
      eta: item.eta,
      inStock: true,
    }));

  if (top3.length === 0) {
    return NextResponse.json({
      results: [],
      message: `Sorry, "${query}" is out of stock across all merchants.`,
    });
  }

  return NextResponse.json({ results: top3 });
}
