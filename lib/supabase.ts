/**
 * lib/supabase.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Supabase client singletons for:
 *   - Browser / RSC (anon key, read-only public data)
 *   - Server-side API routes (service role, bypasses RLS)
 *
 * Usage:
 *   import { browserClient } from "@/lib/supabase";   // client components
 *   import { serverClient } from "@/lib/supabase";    // server-only API routes
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// ── Env vars ─────────────────────────────────────────────────────────────────

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnon) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars."
  );
}

// ── Browser client (singleton, anon key) ─────────────────────────────────────
let _browserClient: SupabaseClient<Database> | null = null;

export function browserClient(): SupabaseClient<Database> {
  if (!_browserClient) {
    _browserClient = createClient<Database>(supabaseUrl, supabaseAnon, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return _browserClient;
}

// ── Server / service-role client (never exposed to browser) ──────────────────
export function serverClient(): SupabaseClient<Database> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY env var on server.");
  }
  // Always create a fresh instance – Next.js server components re-run per request
  return createClient<Database>(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ── Helper: PostGIS nearby-stores query ──────────────────────────────────────
/**
 * Returns stores within `radiusMetres` of the given coordinates,
 * ordered by ascending distance.
 *
 * @example
 * const stores = await nearbyStores(db, 43.78, -79.93, 25_000);
 */
export async function nearbyStores(
  db: SupabaseClient<Database>,
  lat: number,
  lng: number,
  radiusMetres = 25_000,
) {
  const { data, error } = await db.rpc("nearby_stores", {
    user_lat: lat,
    user_lng: lng,
    radius_m: radiusMetres,
  });
  if (error) throw error;
  return data ?? [];
}
