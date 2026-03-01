/**
 * app/product/[id]/page.tsx – Product detail + Price List
 * ─────────────────────────────────────────────────────────────────────────────
 * Shows canonical product info at top, then a ranked list of prices across
 * stores sorted by Confidence Score (S) descending.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { serverClient } from "@/lib/supabase";
import PriceList from "@/components/product/PriceList";
import BottomNav from "@/components/ui/BottomNav";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const db = serverClient();
  const { data: product } = await db.from("products").select("name, brand").eq("id", id).single();
  if (!product) return { title: "Product Not Found" };
  return {
    title: product.brand ? `${product.brand} ${product.name}` : product.name,
    description: `Compare grocery prices for ${product.name} at Ontario stores.`,
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params;
  const db = serverClient();

  // ── Fetch product ─────────────────────────────────────────────────────────
  const { data: product, error: pErr } = await db
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (pErr || !product) notFound();

  // ── Fetch prices with store join, sorted by confidence ────────────────────
  const { data: prices } = await db
    .from("prices")
    .select(`
      *,
      store:stores(id, name, chain, city, address)
    `)
    .eq("product_id", id)
    .order("confidence_score", { ascending: false })
    .limit(20);

  const effectivePrices = prices ?? [];

  return (
    <main className="flex flex-col min-h-screen bg-gray-50">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm pt-safe">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <a
            href="/"
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            aria-label="Back"
          >
            ←
          </a>
          <span className="font-semibold text-gray-900 truncate">Price Comparison</span>
        </div>
      </header>

      {/* ── Product Hero ────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-100 px-4 py-5 max-w-lg mx-auto w-full">
        <div className="flex gap-4 items-start">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.name}
              className="w-20 h-20 rounded-xl object-contain border border-gray-100 shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center text-3xl shrink-0">
              🛒
            </div>
          )}
          <div className="min-w-0">
            {product.brand && (
              <p className="text-xs text-brand-600 font-semibold uppercase tracking-wider mb-0.5">
                {product.brand}
              </p>
            )}
            <h1 className="text-lg font-bold text-gray-900 leading-snug">{product.name}</h1>
            {product.unit && (
              <p className="text-sm text-gray-500 mt-0.5">{product.unit}</p>
            )}
            {product.upc && (
              <p className="text-xs text-gray-400 font-mono mt-1">UPC {product.upc}</p>
            )}
          </div>
        </div>

        {/* Price range summary */}
        {effectivePrices.length > 0 && (
          <div className="mt-4 flex gap-3">
            <Stat
              label="Best Price"
              value={`$${(Math.min(...effectivePrices.map((p) => p.sale_price_cents ?? p.price_cents)) / 100).toFixed(2)}`}
              accent="text-brand-600"
            />
            <Stat
              label="Avg Price"
              value={`$${(effectivePrices.reduce((s, p) => s + p.price_cents, 0) / effectivePrices.length / 100).toFixed(2)}`}
            />
            <Stat
              label="Stores"
              value={`${effectivePrices.length}`}
            />
          </div>
        )}
      </section>

      {/* ── Price List ──────────────────────────────────────────────────── */}
      <section className="flex-1 max-w-lg mx-auto w-full px-4 py-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Prices by confidence score
        </h2>
        <PriceList prices={effectivePrices} productId={id} />
      </section>

      <BottomNav active="search" />
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
      <p className={`text-lg font-bold ${accent ?? "text-gray-900"}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
