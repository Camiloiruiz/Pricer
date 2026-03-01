/**
 * components/ui/StoreCard.tsx
 * Card displaying a store with chain logo placeholder, address, distance.
 */
import type { Store } from "@/types/database";

const CHAIN_EMOJI: Record<string, string> = {
  loblaws:   "🟠",
  walmart:   "🔵",
  no_frills: "🟡",
  freshco:   "🟢",
  metro:     "🔴",
  sobeys:    "🟤",
};

const CHAIN_LABEL: Record<string, string> = {
  loblaws:   "Loblaws",
  walmart:   "Walmart",
  no_frills: "No Frills",
  freshco:   "FreshCo",
  metro:     "Metro",
  sobeys:    "Sobeys",
};

interface Props {
  store: Store & { distance_m?: number };
  href?: string;
}

export default function StoreCard({ store, href }: Props) {
  const emoji = CHAIN_EMOJI[store.chain] ?? "🏪";
  const label = CHAIN_LABEL[store.chain] ?? store.chain;
  const dist  = store.distance_m != null
    ? store.distance_m < 1000
      ? `${Math.round(store.distance_m)} m`
      : `${(store.distance_m / 1000).toFixed(1)} km`
    : null;

  const inner = (
    <div className="card flex items-start gap-3 p-4 hover:shadow-md active:scale-[0.98] transition-all">
      {/* Chain logo / emoji */}
      <span
        className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center text-xl shrink-0 border border-gray-100"
        aria-hidden
      >
        {emoji}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-gray-900 leading-snug truncate">{store.name}</p>
            <p className="text-xs text-gray-400 font-medium mt-0.5">{label}</p>
          </div>
          {dist && (
            <span className="text-xs text-brand-600 font-semibold bg-brand-50 rounded-full px-2 py-0.5 shrink-0">
              {dist}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1 truncate">{store.address}, {store.city}</p>
      </div>

      <span className="text-gray-300 self-center text-lg" aria-hidden>›</span>
    </div>
  );

  if (href) {
    return <a href={href} className="block" aria-label={`${store.name} – ${dist ?? store.city}`}>{inner}</a>;
  }
  return inner;
}
