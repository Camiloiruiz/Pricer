/**
 * app/api/stores/route.ts
 * GET /api/stores?lat=43.78&lng=-79.93&radius=25000
 * Returns stores within radius (metres) of the given coordinates.
 */
import { NextRequest, NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat    = parseFloat(searchParams.get("lat") ?? "");
  const lng    = parseFloat(searchParams.get("lng") ?? "");
  const radius = parseInt(searchParams.get("radius") ?? "25000", 10);

  if (!isFinite(lat) || !isFinite(lng)) {
    return NextResponse.json(
      { error: "lat and lng query params are required and must be numbers." },
      { status: 400 }
    );
  }

  if (radius < 500 || radius > 100_000) {
    return NextResponse.json(
      { error: "radius must be between 500 and 100000 metres." },
      { status: 400 }
    );
  }

  const db = serverClient();

  // Use the nearby_stores Postgres function (requires the RPC to be defined)
  // Fallback: ST_DWithin via raw SQL if the function isn't yet deployed
  const { data, error } = await db.rpc("nearby_stores", {
    user_lat: lat,
    user_lng: lng,
    radius_m: radius,
  });

  if (error) {
    console.error("[/api/stores]", error.message);
    return NextResponse.json({ error: "Failed to fetch stores." }, { status: 500 });
  }

  return NextResponse.json({ stores: data ?? [] }, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
  });
}
