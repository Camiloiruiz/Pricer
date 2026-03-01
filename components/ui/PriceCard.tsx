/**
 * components/ui/PriceCard.tsx
 * Displays a single price row in the Product detail view.
 * Shows store name, price, sale badge, staleness warning, confidence badge.
 */
import ConfidenceBadge from "./ConfidenceBadge";
import type { Price } from "@/types/database";

interface Props {
  price: Price;
  rank:  number;   // 1 = best (lowest effective price)
}

export default function PriceCard({ price, rank }: Props) {
  const effective = price.sale_price_cents ?? price.price_cents;
  const isOnSale  = price.sale_price_cents != null && price.sale_price_cents < price.price_cents;

  const updatedAt   = new Date(price.last_updated);
  const ageHours    = (Date.now() - updatedAt.getTime()) / 3_600_000;
  const isStale     = ageHours > 48;
  const freshLabel  = ageHours < 1
    ? "< 1 hr ago"
    : ageHours < 24
    ? `${Math.round(ageHours)} hr ago`
    : `${Math.round(ageHours / 24)} d ago`;

  const store = price.store as { name?: string; chain?: string; city?: string } | undefined;

  return (
    <div
      className={`card p-4 flex items-center gap-3 ${rank === 1 ? "ring-2 ring-brand-500" : ""}`}
      role="listitem"
    >
      {/* Rank badge */}
      <span
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
          ${rank === 1 ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-500"}`}
        aria-label={`Rank ${rank}`}
      >
        #{rank}
      </span>

      {/* Store info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{store?.name ?? "Unknown Store"}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-gray-400">{store?.city}</p>
          <span className="text-gray-200">·</span>
          <p className={`text-xs ${isStale ? "text-orange-500" : "text-gray-400"}`}>
            {isStale ? "⚠ " : ""}Updated {freshLabel}
          </p>
        </div>
        <div className="mt-1">
          <ConfidenceBadge score={price.confidence_score} />
        </div>
      </div>

      {/* Price */}
      <div className="text-right shrink-0">
        <p className="text-xl font-bold text-gray-900">
          ${(effective / 100).toFixed(2)}
        </p>
        {isOnSale && (
          <>
            <p className="text-xs text-gray-400 line-through">${(price.price_cents / 100).toFixed(2)}</p>
            <span className="inline-block text-xs bg-red-100 text-red-600 font-semibold rounded px-1.5">
              SALE
            </span>
          </>
        )}
        <p className="text-xs text-gray-400 mt-0.5 capitalize">{price.source}</p>
      </div>
    </div>
  );
}
