/**
 * types/database.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Supabase TypeScript types (manual; run `supabase gen types` to auto-generate)
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type StoreChain = "loblaws" | "walmart" | "no_frills" | "freshco" | "metro" | "sobeys";
export type SubmissionStatus = "pending" | "approved" | "rejected";
export type PriceSource = "scraper" | "user";
export type ConfidenceGrade = "high" | "medium" | "low";

// ── Row shapes ────────────────────────────────────────────────────────────────

export interface Store {
  id:           string;
  name:         string;
  chain:        StoreChain;
  address:      string;
  city:         string;
  province:     string;
  postal_code:  string | null;
  location:     string;            // PostGIS GEOGRAPHY (WKB hex from API)
  phone:        string | null;
  created_at:   string;
  updated_at:   string;
  // Virtual – returned by nearby_stores RPC
  distance_m?:  number;
  lat?:         number;
  lng?:         number;
}

export interface Product {
  id:          string;
  name:        string;
  brand:       string | null;
  category:    string | null;
  upc:         string | null;
  unit:        string | null;
  image_url:   string | null;
  created_at:  string;
  updated_at:  string;
}

export interface Price {
  id:               string;
  product_id:       string;
  store_id:         string;
  price_cents:      number;
  sale_price_cents: number | null;
  source:           PriceSource;
  confidence_score: number;
  last_updated:     string;
  // Joined virtual fields
  store?:           Store;
  product?:         Product;
}

export interface PriceHistory {
  id:          string;
  product_id:  string;
  store_id:    string;
  price_cents: number;
  source:      PriceSource;
  recorded_at: string;
}

export interface UserSubmission {
  id:               string;
  product_id:       string | null;
  store_id:         string | null;
  submitted_name:   string;
  price_cents:      number;
  submitter_lat:    number | null;
  submitter_lng:    number | null;
  image_url:        string | null;
  ocr_raw:          string | null;
  confidence_score: number | null;
  gps_score:        number | null;
  price_score:      number | null;
  semantic_score:   number | null;
  status:           SubmissionStatus;
  reviewed_at:      string | null;
  created_at:       string;
  // Joined
  product?:         Product;
  store?:           Store;
}

export interface PriceStats30d {
  product_id:    string;
  store_id:      string;
  mean_cents:    number;
  stddev_cents:  number;
  sample_count:  number;
  min_cents:     number;
  max_cents:     number;
}

// ── Database schema type (for SupabaseClient<Database>) ─────────────────────

export interface Database {
  public: {
    Tables: {
      stores: {
        Row:    Store;
        Insert: Omit<Store, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Store, "id">>;
      };
      products: {
        Row:    Product;
        Insert: Omit<Product, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Product, "id">>;
      };
      prices: {
        Row:    Price;
        Insert: Omit<Price, "id">;
        Update: Partial<Omit<Price, "id">>;
      };
      price_history: {
        Row:    PriceHistory;
        Insert: Omit<PriceHistory, "id">;
        Update: never;
      };
      user_submissions: {
        Row:    UserSubmission;
        Insert: Omit<UserSubmission, "id" | "created_at">;
        Update: Partial<Omit<UserSubmission, "id">>;
      };
    };
    Views: {
      v_price_stats_30d: {
        Row: PriceStats30d;
      };
    };
    Functions: {
      nearby_stores: {
        Args:    { user_lat: number; user_lng: number; radius_m: number };
        Returns: (Store & { distance_m: number })[];
      };
      fn_purge_stale_prices: {
        Args:    Record<string, never>;
        Returns: void;
      };
    };
    Enums: Record<string, never>;
  };
}
