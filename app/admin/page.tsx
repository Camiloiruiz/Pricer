/**
 * app/admin/page.tsx – Admin Moderation Dashboard
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-rendered list of all pending user_submissions with S < 0.7.
 * "One-Click Purge" button fires a DELETE to /api/admin/purge.
 * Individual approve / reject handled by /api/submissions/[id].
 */
import type { Metadata } from "next";
import { serverClient } from "@/lib/supabase";
import ModerationTable from "@/components/admin/ModerationTable";

export const metadata: Metadata = {
  title: "Admin – Moderation Queue",
  robots: { index: false, follow: false },
};

// Revalidate every 60 s so the admin sees fresh data without a hard refresh
export const revalidate = 60;

export default async function AdminPage() {
  // ── Guard: basic secret check (replace with real auth) ───────────────────
  // In production gate this route with Supabase Auth or middleware.

  const db = serverClient();

  // Flagged submissions: pending AND confidence < 0.70
  const { data: flagged } = await db
    .from("user_submissions")
    .select(`
      *,
      product:products(id, name, brand, image_url),
      store:stores(id, name, chain, city)
    `)
    .eq("status", "pending")
    .lt("confidence_score", 0.70)
    .order("created_at", { ascending: false })
    .limit(100);

  // All pending (for the summary counters)
  const { count: pendingCount } = await db
    .from("user_submissions")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const { count: flaggedCount } = await db
    .from("user_submissions")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .lt("confidence_score", 0.70);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Moderation Queue</h1>
            <p className="text-sm text-gray-500">Submissions with Confidence Score &lt; 0.70</p>
          </div>
          <a href="/" className="text-sm text-brand-600 hover:underline">← Home</a>
        </div>
      </header>

      {/* ── Summary Stats ────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 py-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Pending Total"  value={pendingCount ?? 0} />
        <StatCard label="Flagged (S<0.7)" value={flaggedCount ?? 0} color="text-red-600" />
        <StatCard label="Shown Below"    value={flagged?.length ?? 0} />
        <StatCard label="Flag Rate"
          value={pendingCount ? `${Math.round(((flaggedCount ?? 0) / pendingCount) * 100)}%` : "—"} />
      </div>

      {/* ── One-Click Purge Panel ────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 mb-4">
        <div className="card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-gray-900">One-Click Purge</p>
            <p className="text-sm text-gray-500">
              Permanently rejects all <strong>{flaggedCount ?? 0}</strong> pending submissions
              with&nbsp;S&nbsp;&lt;&nbsp;0.70. This action cannot be undone.
            </p>
          </div>
          {/* Client component form wraps the button so it works without JS */}
          <form action="/api/admin/purge" method="POST">
            <button
              type="submit"
              className="btn-danger whitespace-nowrap"
              disabled={!flaggedCount}
            >
              Purge {flaggedCount ?? 0} items
            </button>
          </form>
        </div>
      </div>

      {/* ── Moderation Table ─────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 pb-12">
        {flagged && flagged.length > 0 ? (
          <ModerationTable submissions={flagged} />
        ) : (
          <div className="card p-12 text-center text-gray-400">
            <p className="text-4xl mb-2">✓</p>
            <p className="font-medium text-gray-600">Queue is clear — no flagged submissions.</p>
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="card p-4 text-center">
      <p className={`text-2xl font-bold ${color ?? "text-gray-900"}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
