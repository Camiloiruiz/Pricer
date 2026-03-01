/**
 * app/page.tsx – Home page (Server Component shell + Client islands)
 * ─────────────────────────────────────────────────────────────────────────────
 * Layout:
 *   [Header with logo]
 *   [SearchBar – client island]
 *   [StoresFeed – "Stores Near [City]" – client island with Geolocation]
 *   [BottomNav]
 */
import { Suspense } from "react";
import SearchBar from "@/components/ui/SearchBar";
import StoresFeed from "@/components/home/StoresFeed";
import BottomNav from "@/components/ui/BottomNav";

export default function HomePage() {
  return (
    <main className="flex flex-col min-h-screen bg-gray-50">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm pt-safe">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Logo mark */}
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-brand-600 text-white font-bold text-sm">
              S
            </span>
            <span className="text-lg font-bold text-gray-900 tracking-tight">
              Sertch
            </span>
          </div>
          <a
            href="/submit"
            className="btn-primary text-sm py-2 px-3"
            aria-label="Submit a price"
          >
            + Price
          </a>
        </div>
      </header>

      {/* ── Hero / Search ────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-brand-600 to-brand-700 px-4 pb-8 pt-6">
        <div className="max-w-lg mx-auto">
          <p className="text-brand-100 text-sm font-medium mb-1 uppercase tracking-widest">
            Ontario Grocery Prices
          </p>
          <h1 className="text-white text-2xl font-bold mb-4 leading-snug">
            Find the lowest price<br />near you — right now.
          </h1>
          <SearchBar />
        </div>
      </section>

      {/* ── Stores Near You ──────────────────────────────────────────────── */}
      <section className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        <Suspense
          fallback={
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="card h-24 skeleton" />
              ))}
            </div>
          }
        >
          <StoresFeed />
        </Suspense>
      </section>

      {/* ── Bottom Nav ───────────────────────────────────────────────────── */}
      <BottomNav active="home" />
    </main>
  );
}
