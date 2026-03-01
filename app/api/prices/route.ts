/**
 * app/api/prices/route.ts
 * GET /api/prices?product_id=<uuid>&store_id=<uuid>
 * Returns current prices for a product, optionally filtered by store.
 * Sorted by effective price (sale_price if available) ascending.
 */
import { NextRequest, NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const productId = searchParams.get("product_id");
  const storeId   = searchParams.get("store_id");

  if (!productId) {
    return NextResponse.json({ error: "product_id is required." }, { status: 400 });
  }

  const db = serverClient();

  let query = db
    .from("prices")
    .select(`
      id,
      price_cents,
      sale_price_cents,
      source,
      confidence_score,
      last_updated,
      store:stores(id, name, chain, city, address, postal_code)
    `)
    .eq("product_id", productId)
    .order("confidence_score", { ascending: false });

  if (storeId) {
    query = query.eq("store_id", storeId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[/api/prices]", error.message);
    return NextResponse.json({ error: "Failed to fetch prices." }, { status: 500 });
  }

  return NextResponse.json({ prices: data ?? [] }, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" },
  });
}
