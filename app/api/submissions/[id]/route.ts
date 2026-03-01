/**
 * app/api/submissions/[id]/route.ts
 * PATCH /api/submissions/:id  → approve | reject
 */
import { NextRequest, NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase";

export const runtime = "edge";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body: unknown = await req.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "JSON body required." }, { status: 400 });
  }

  const action = (body as Record<string, unknown>).action;
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json(
      { error: 'action must be "approve" or "reject".' },
      { status: 400 }
    );
  }

  const db = serverClient();

  const { data: sub, error: fetchErr } = await db
    .from("user_submissions")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !sub) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  // Update status
  const { error: updateErr } = await db
    .from("user_submissions")
    .update({ status: action === "approve" ? "approved" : "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", id);

  if (updateErr) {
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }

  // If approving and product+store known, upsert live price
  if (action === "approve" && sub.product_id && sub.store_id) {
    await db.from("prices").upsert(
      {
        product_id:       sub.product_id,
        store_id:         sub.store_id,
        price_cents:      sub.price_cents,
        source:           "user",
        confidence_score: sub.confidence_score ?? 0.5,
        last_updated:     new Date().toISOString(),
      },
      { onConflict: "product_id,store_id" }
    );
  }

  return NextResponse.json({ id, status: action === "approve" ? "approved" : "rejected" });
}
