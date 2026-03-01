/**
 * components/admin/ModerationTable.tsx
 * Interactive table of flagged user submissions.
 * Approve / Reject buttons fire PATCH /api/submissions/:id.
 */
"use client";

import { useState, useTransition } from "react";
import ConfidenceBadge from "@/components/ui/ConfidenceBadge";
import type { UserSubmission } from "@/types/database";

interface Props {
  submissions: UserSubmission[];
}

type RowStatus = "pending" | "approved" | "rejected" | "loading";

export default function ModerationTable({ submissions }: Props) {
  const [rows,    setRows]    = useState<(UserSubmission & { rowStatus: RowStatus })[]>(
    submissions.map((s) => ({ ...s, rowStatus: "pending" }))
  );
  const [pending, startTransition] = useTransition();

  async function act(id: string, action: "approve" | "reject") {
    setRows((prev) =>
      prev.map((r) => r.id === id ? { ...r, rowStatus: "loading" } : r)
    );

    const res = await fetch(`/api/submissions/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action }),
    });

    const finalStatus: RowStatus = res.ok
      ? (action === "approve" ? "approved" : "rejected")
      : "pending";

    startTransition(() => {
      setRows((prev) =>
        prev.map((r) => r.id === id ? { ...r, rowStatus: finalStatus } : r)
      );
    });
  }

  const visible = rows.filter((r) => r.rowStatus === "pending" || r.rowStatus === "loading");

  if (visible.length === 0) {
    return (
      <div className="card p-10 text-center text-gray-400">
        <p className="text-3xl mb-2">✓</p>
        <p className="font-medium text-gray-600">All items reviewed.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="min-w-full text-sm" role="grid" aria-label="Flagged submissions">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Store</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Score</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">
              Sub-Scores
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((sub) => {
            const product = sub.product as { name?: string; brand?: string; image_url?: string } | undefined;
            const store   = sub.store   as { name?: string; city?: string } | undefined;
            const isLoading = sub.rowStatus === "loading";
            const isDone    = sub.rowStatus === "approved" || sub.rowStatus === "rejected";

            return (
              <tr
                key={sub.id}
                className={`transition-all ${
                  isDone ? "opacity-40" : "hover:bg-gray-50/50"
                }`}
                aria-label={`Submission: ${sub.submitted_name}`}
              >
                {/* Product */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 max-w-[180px]">
                    {product?.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.image_url} alt="" className="w-8 h-8 rounded object-contain" />
                    ) : (
                      <span className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-sm">🛒</span>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{sub.submitted_name}</p>
                      {product?.name && product.name !== sub.submitted_name && (
                        <p className="text-xs text-gray-400 truncate">→ {product.name}</p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Store */}
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-700 truncate max-w-[120px]">
                    {store?.name ?? "—"}
                  </p>
                  <p className="text-xs text-gray-400">{store?.city}</p>
                </td>

                {/* Price */}
                <td className="px-4 py-3 text-right">
                  <span className="font-bold text-gray-900">
                    ${(sub.price_cents / 100).toFixed(2)}
                  </span>
                </td>

                {/* Composite Score */}
                <td className="px-4 py-3 text-center">
                  <ConfidenceBadge score={sub.confidence_score} showLabel={false} />
                </td>

                {/* Sub-scores */}
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-0.5 text-xs text-gray-500 font-mono">
                    <span title="GPS score">G:{fmt(sub.gps_score)}</span>
                    <span title="Price score">P:{fmt(sub.price_score)}</span>
                    <span title="Semantic score">M:{fmt(sub.semantic_score)}</span>
                  </div>
                </td>

                {/* Submitted at */}
                <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                  {new Date(sub.created_at).toLocaleString("en-CA", {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-right">
                  {isDone ? (
                    <span className={`text-xs font-semibold ${sub.rowStatus === "approved" ? "text-green-600" : "text-red-500"}`}>
                      {sub.rowStatus}
                    </span>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => act(sub.id, "approve")}
                        disabled={isLoading}
                        className="px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs font-semibold
                                   hover:bg-green-200 disabled:opacity-50 transition-colors"
                        aria-label="Approve"
                      >
                        {isLoading ? "…" : "✓ Approve"}
                      </button>
                      <button
                        type="button"
                        onClick={() => act(sub.id, "reject")}
                        disabled={isLoading}
                        className="px-3 py-1.5 rounded-lg bg-red-100 text-red-600 text-xs font-semibold
                                   hover:bg-red-200 disabled:opacity-50 transition-colors"
                        aria-label="Reject"
                      >
                        {isLoading ? "…" : "✕ Reject"}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Reviewed rows summary */}
      {rows.some((r) => r.rowStatus !== "pending" && r.rowStatus !== "loading") && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
          {rows.filter((r) => r.rowStatus === "approved").length} approved ·{" "}
          {rows.filter((r) => r.rowStatus === "rejected").length} rejected this session
        </div>
      )}
    </div>
  );
}

function fmt(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toFixed(2);
}
