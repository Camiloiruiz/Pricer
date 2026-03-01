/**
 * app/api/submissions/route.ts
 * POST /api/submissions
 * Accepts a user-submitted price, runs the accuracy engine, persists the result.
 */
import { NextRequest, NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase";
import { validateSubmission } from "@/lib/validation/submission";
import { verify } from "@/lib/verify";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // ── 1. Validate input ────────────────────────────────────────────────────
  const validation = validateSubmission(body);
  if (!validation.valid || !validation.data) {
    return NextResponse.json({ errors: validation.errors }, { status: 422 });
  }
  const sub = validation.data;
  const db  = serverClient();

  // ── 2. Fetch store coordinates ───────────────────────────────────────────
  const { data: store, error: storeErr } = await db
    .from("stores")
    .select("id, lat, lng")
    .eq("id", sub.store_id)
    .single();

  if (storeErr || !store) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  // ── 3. Fetch canonical product name (for semantic score) ─────────────────
  let canonicalName = sub.submitted_name; // fallback: same string → M=1
  if (sub.product_id) {
    const { data: product } = await db
      .from("products")
      .select("name")
      .eq("id", sub.product_id)
      .single();
    if (product) canonicalName = product.name;
  }

  // ── 4. Fetch 30-day price stats ──────────────────────────────────────────
  let meanCents    = sub.price_cents; // neutral fallback
  let stddevCents  = 0;
  let sampleCount  = 0;

  if (sub.product_id) {
    const { data: stats } = await db
      .from("v_price_stats_30d")
      .select("mean_cents, stddev_cents, sample_count")
      .eq("product_id", sub.product_id)
      .eq("store_id", sub.store_id)
      .single();

    if (stats) {
      meanCents   = stats.mean_cents;
      stddevCents = stats.stddev_cents ?? 0;
      sampleCount = stats.sample_count;
    }
  }

  // ── 5. Run accuracy engine ───────────────────────────────────────────────
  const result = verify({
    gps: {
      submitterLat: sub.submitter_lat ?? 0,
      submitterLng: sub.submitter_lng ?? 0,
      storeLat:     (store as any).lat ?? 0,
      storeLng:     (store as any).lng ?? 0,
    },
    price: {
      submittedCents:       sub.price_cents,
      historicalMeanCents:  meanCents,
      historicalStddevCents: stddevCents,
      sampleCount,
    },
    semantic: {
      submittedName: sub.submitted_name,
      canonicalName,
    },
  });

  // ── 6. Persist submission ────────────────────────────────────────────────
  const { data: inserted, error: insertErr } = await db
    .from("user_submissions")
    .insert({
      product_id:       sub.product_id ?? null,
      store_id:         sub.store_id,
      submitted_name:   sub.submitted_name,
      price_cents:      sub.price_cents,
      submitter_lat:    sub.submitter_lat ?? null,
      submitter_lng:    sub.submitter_lng ?? null,
      image_url:        sub.image_url ?? null,
      ocr_raw:          sub.ocr_raw ?? null,
      confidence_score: result.score,
      gps_score:        result.gpsScore,
      price_score:      result.priceScore,
      semantic_score:   result.semanticScore,
      status:           result.flagged ? "pending" : "approved",
    })
    .select("id, confidence_score, status")
    .single();

  if (insertErr) {
    console.error("[/api/submissions]", insertErr.message);
    return NextResponse.json({ error: "Failed to save submission." }, { status: 500 });
  }

  // ── 7. If high-confidence and auto-approved, upsert live price ───────────
  if (!result.flagged && sub.product_id) {
    await db.from("prices").upsert(
      {
        product_id:       sub.product_id,
        store_id:         sub.store_id,
        price_cents:      sub.price_cents,
        source:           "user",
        confidence_score: result.score,
        last_updated:     new Date().toISOString(),
      },
      { onConflict: "product_id,store_id" }
    );
  }

  return NextResponse.json(
    { submission: inserted, score: result },
    { status: 201 }
  );
}
