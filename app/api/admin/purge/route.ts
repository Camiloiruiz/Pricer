/**
 * app/api/admin/purge/route.ts
 * POST /api/admin/purge
 * Rejects all pending submissions with confidence_score < 0.70.
 * Protected by ADMIN_SECRET header (replace with proper auth in production).
 */
import { NextRequest, NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  // ── Basic secret check ───────────────────────────────────────────────────
  const secret = req.headers.get("x-admin-secret") ??
    // Allow form-based POST from admin page (same-origin only)
    req.headers.get("referer")?.includes("/admin") ? process.env.ADMIN_SECRET : null;

  if (!secret || secret !== process.env.ADMIN_SECRET) {
    // For form POST from same-origin admin page, allow if referer matches
    const referer = req.headers.get("referer") ?? "";
    const isFormPost = req.headers.get("content-type")?.includes("application/x-www-form-urlencoded");
    const isAdminReferer = referer.includes("/admin");

    if (!(isFormPost && isAdminReferer)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  const db = serverClient();

  const { count, error } = await db
    .from("user_submissions")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("status", "pending")
    .lt("confidence_score", 0.70)
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error("[/api/admin/purge]", error.message);
    return NextResponse.json({ error: "Purge failed." }, { status: 500 });
  }

  // Also delete stale scraper prices (> 7 days)
  await db.rpc("fn_purge_stale_prices");

  // Redirect back to admin page for form-based POST
  const isFormPost = req.headers.get("content-type")?.includes("application/x-www-form-urlencoded");
  if (isFormPost) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.json({ purged: count ?? 0 });
}
