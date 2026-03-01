/**
 * app/api/products/route.ts
 * GET /api/products?q=milk&limit=20&offset=0
 * Full-text + trigram search over products table.
 */
import { NextRequest, NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q      = (searchParams.get("q") ?? "").trim();
  const limit  = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10), 0);

  const db = serverClient();

  let query = db
    .from("products")
    .select("id, name, brand, category, upc, unit, image_url")
    .range(offset, offset + limit - 1);

  if (q.length >= 2) {
    // Use Postgres full-text search; Supabase exposes this via `textSearch`
    query = query.textSearch("name", q, {
      type:   "websearch",
      config: "english",
    });
  } else {
    query = query.order("name");
  }

  const { data, error } = await query;

  if (error) {
    console.error("[/api/products]", error.message);
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }

  return NextResponse.json({ products: data ?? [], q }, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  });
}
