/**
 * components/product/PriceList.tsx
 * Sorted price list for a product.
 * Prices arrive pre-sorted by confidence_score DESC from the server.
 * Re-sorts client-side by effective price for the "Best Price" toggle.
 */
"use client";

import { useState, useMemo } from "react";
import PriceCard from "@/components/ui/PriceCard";
import type { Price } from "@/types/database";

type SortKey = "confidence" | "price";

interface Props {
  prices:    Price[];
  productId: string;
}

export default function PriceList({ prices, productId }: Props) {
  const [sort, setSort] = useState<SortKey>("confidence");

  const sorted = useMemo(() => {
    if (sort === "price") {
      return [...prices].sort(
        (a, b) =>
          (a.sale_price_cents ?? a.price_cents) -
          (b.sale_price_cents ?? b.price_cents)
      );
    }
    return [...prices].sort((a, b) => b.confidence_score - a.confidence_score);
  }, [prices, sort]);

  if (prices.length === 0) {
    return (
      <div className="card p-10 text-center text-gray-400">
        <p className="text-3xl mb-2">💸</p>
        <p className="text-sm">No prices recorded yet for this product.</p>
        <a href="/submit" className="btn-primary mt-4 text-sm py-2 px-4 inline-flex">
          Submit First Price
        </a>
      </div>
    );
  }

  return (
    <div>
      {/* Sort toggle */}
      <div className="flex gap-2 mb-3" role="group" aria-label="Sort by">
        <button
          type="button"
          onClick={() => setSort("confidence")}
          className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-colors
            ${sort === "confidence"
              ? "bg-brand-600 border-brand-600 text-white"
              : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"}`}
          aria-pressed={sort === "confidence"}
        >
          Best Confidence
        </button>
        <button
          type="button"
          onClick={() => setSort("price")}
          className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-colors
            ${sort === "price"
              ? "bg-brand-600 border-brand-600 text-white"
              : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"}`}
          aria-pressed={sort === "price"}
        >
          Lowest Price
        </button>
      </div>

      {/* Price cards */}
      <ul className="space-y-2.5 pb-28" role="list" aria-label="Prices sorted by confidence">
        {sorted.map((price, idx) => (
          <li key={price.id}>
            <PriceCard price={price} rank={idx + 1} />
          </li>
        ))}
      </ul>

      {/* Submit CTA */}
      <div className="fixed bottom-20 left-0 right-0 px-4 pb-2 max-w-lg mx-auto">
        <a
          href={`/submit?product_id=${productId}`}
          className="btn-primary w-full justify-center shadow-lg"
        >
          📷 Submit Updated Price
        </a>
      </div>
    </div>
  );
}
