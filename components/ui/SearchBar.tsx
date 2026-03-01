/**
 * components/ui/SearchBar.tsx
 * Debounced search bar that hits GET /api/products?q=...
 * Renders inline results dropdown.
 */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/types/database";

export default function SearchBar() {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);
  const router  = useRef(useRouter());
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus search on mount if ?focus=search
  useEffect(() => {
    if (window.location.search.includes("focus=search")) {
      inputRef.current?.focus();
    }
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/products?q=${encodeURIComponent(q)}&limit=8`);
      const json = await res.json();
      setResults(json.products ?? []);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(v), 300);
  };

  const handleSelect = (product: Product) => {
    setOpen(false);
    setQuery(product.name);
    router.current.push(`/product/${product.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
  };

  return (
    <div className="relative w-full">
      {/* Input */}
      <div className="relative">
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none"
          aria-hidden
        >
          🔍
        </span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search milk, eggs, bread…"
          autoComplete="off"
          className="w-full rounded-2xl border-0 bg-white/20 backdrop-blur-sm text-white placeholder-white/60
                     pl-10 pr-4 py-3.5 text-sm font-medium
                     focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/30
                     transition-all"
          aria-label="Search grocery products"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls="search-results"
          role="combobox"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <span className="block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          </span>
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <ul
          id="search-results"
          role="listbox"
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100
                     overflow-hidden z-50 divide-y divide-gray-50"
        >
          {results.map((product) => (
            <li key={product.id} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => handleSelect(product)}
                className="w-full text-left flex items-center gap-3 px-4 py-3
                           hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                {product.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.image_url} alt="" className="w-10 h-10 rounded-lg object-contain shrink-0" />
                ) : (
                  <span className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg shrink-0">
                    🛒
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {[product.brand, product.unit].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span className="text-gray-300 shrink-0">›</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
