/**
 * components/home/StoresFeed.tsx
 * "Stores Near [City]" feed using browser Geolocation API.
 * Client component — fetches /api/stores after acquiring GPS coords.
 */
"use client";

import { useEffect, useState } from "react";
import StoreCard from "@/components/ui/StoreCard";
import type { Store } from "@/types/database";

interface GeoState {
  status: "idle" | "requesting" | "granted" | "denied" | "error";
  lat?: number;
  lng?: number;
  city?: string;
  error?: string;
}

interface StoreWithDist extends Store {
  distance_m: number;
}

// Reverse-geocode to get city name from Nominatim (OSM, no API key needed)
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res  = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en-CA" } }
    );
    const json = await res.json();
    return (
      json?.address?.town ??
      json?.address?.city ??
      json?.address?.village ??
      json?.address?.municipality ??
      "your area"
    );
  } catch {
    return "your area";
  }
}

export default function StoresFeed() {
  const [geo,    setGeo]    = useState<GeoState>({ status: "idle" });
  const [stores, setStores] = useState<StoreWithDist[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeo({ status: "denied", error: "Geolocation is not supported by your browser." });
      return;
    }

    setGeo({ status: "requesting" });

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const city = await reverseGeocode(lat, lng);
        setGeo({ status: "granted", lat, lng, city });
      },
      (err) => {
        setGeo({
          status: "denied",
          error: err.code === 1
            ? "Location access denied. Enable it in your browser settings."
            : "Could not determine your location.",
        });
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 }
    );
  }, []);

  // Fetch stores once we have coords
  useEffect(() => {
    if (geo.status !== "granted" || !geo.lat || !geo.lng) return;

    setLoading(true);
    fetch(`/api/stores?lat=${geo.lat}&lng=${geo.lng}&radius=25000`)
      .then((r) => r.json())
      .then((json) => setStores(json.stores ?? []))
      .catch(() => setStores([]))
      .finally(() => setLoading(false));
  }, [geo.status, geo.lat, geo.lng]);

  // ── States ────────────────────────────────────────────────────────────────

  if (geo.status === "idle" || geo.status === "requesting") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
        <span className="block w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
        <p className="text-sm">Locating you…</p>
      </div>
    );
  }

  if (geo.status === "denied" || geo.status === "error") {
    return (
      <div className="card p-6 text-center">
        <p className="text-3xl mb-2">📍</p>
        <p className="font-semibold text-gray-700 mb-1">Location needed</p>
        <p className="text-sm text-gray-500">{geo.error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn-primary mt-4 text-sm py-2 px-4"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Section heading */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-gray-900">
          Stores near{" "}
          <span className="text-brand-600">{geo.city ?? "you"}</span>
        </h2>
        {stores.length > 0 && (
          <span className="text-xs text-gray-400">{stores.length} found</span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-[88px] skeleton" />
          ))}
        </div>
      ) : stores.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">
          <p className="text-3xl mb-2">🏪</p>
          <p className="text-sm">No stores found within 25 km.</p>
        </div>
      ) : (
        <ul className="space-y-3 pb-24" role="list" aria-label="Nearby stores">
          {stores.map((store) => (
            <li key={store.id}>
              <StoreCard store={store} href={`/?store=${store.id}`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
