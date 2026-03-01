-- ════════════════════════════════════════════════════════════════════════════
-- Sertch · Supabase / PostgreSQL schema
-- Run once against a fresh Supabase project (SQL Editor → New query)
-- ════════════════════════════════════════════════════════════════════════════

-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;        -- trigram similarity for search
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";    -- uuid_generate_v4() fallback

-- ════════════════════════════════════════════════════════════════════════════
-- 1. STORES
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS stores (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  chain        TEXT        NOT NULL,   -- 'loblaws' | 'walmart' | 'no_frills' …
  address      TEXT        NOT NULL,
  city         TEXT        NOT NULL,
  province     TEXT        NOT NULL DEFAULT 'ON',
  postal_code  TEXT,
  -- PostGIS geography column – SRID 4326 (WGS-84)
  location     GEOGRAPHY(POINT, 4326) NOT NULL,
  phone        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spatial index – used by ST_DWithin proximity queries
CREATE INDEX IF NOT EXISTS idx_stores_location
  ON stores USING GIST(location);

CREATE INDEX IF NOT EXISTS idx_stores_chain
  ON stores(chain);

-- ════════════════════════════════════════════════════════════════════════════
-- 2. PRODUCTS
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS products (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  brand       TEXT,
  category    TEXT,
  upc         TEXT        UNIQUE,               -- barcode
  unit        TEXT,                             -- '500 g', '1 L', '12-pack'
  image_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Full-text search index on product name
CREATE INDEX IF NOT EXISTS idx_products_fts
  ON products USING GIN(to_tsvector('english', name));

-- Trigram index for fuzzy-match / Levenshtein fallback
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products USING GIN(name gin_trgm_ops);

-- ════════════════════════════════════════════════════════════════════════════
-- 3. PRICES  (current best price per product × store)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS prices (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_id         UUID        NOT NULL REFERENCES stores(id)   ON DELETE CASCADE,
  price_cents      INTEGER     NOT NULL CHECK (price_cents >= 0),
  sale_price_cents INTEGER              CHECK (sale_price_cents >= 0),
  source           TEXT        NOT NULL DEFAULT 'scraper',  -- 'scraper' | 'user'
  confidence_score REAL        NOT NULL DEFAULT 1.0 CHECK (confidence_score BETWEEN 0 AND 1),
  last_updated     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_prices_product   ON prices(product_id);
CREATE INDEX IF NOT EXISTS idx_prices_updated   ON prices(last_updated);
CREATE INDEX IF NOT EXISTS idx_prices_confidence ON prices(confidence_score);

-- ════════════════════════════════════════════════════════════════════════════
-- 4. PRICE HISTORY  (append-only time-series; powers 30-day mean)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS price_history (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_id    UUID        NOT NULL REFERENCES stores(id)   ON DELETE CASCADE,
  price_cents INTEGER     NOT NULL CHECK (price_cents >= 0),
  source      TEXT        NOT NULL DEFAULT 'scraper',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_lookup
  ON price_history(product_id, store_id, recorded_at DESC);

-- ════════════════════════════════════════════════════════════════════════════
-- 5. USER SUBMISSIONS
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_submissions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       UUID        REFERENCES products(id),      -- NULL = new product
  store_id         UUID        REFERENCES stores(id),        -- NULL = unknown store
  submitted_name   TEXT        NOT NULL,                     -- raw OCR / typed text
  price_cents      INTEGER     NOT NULL CHECK (price_cents >= 0),
  submitter_lat    REAL,
  submitter_lng    REAL,
  image_url        TEXT,
  ocr_raw          TEXT,                                     -- raw Tesseract output
  confidence_score REAL CHECK (confidence_score BETWEEN 0 AND 1),
  gps_score        REAL CHECK (gps_score BETWEEN 0 AND 1),
  price_score      REAL CHECK (price_score BETWEEN 0 AND 1),
  semantic_score   REAL CHECK (semantic_score BETWEEN 0 AND 1),
  status           TEXT        NOT NULL DEFAULT 'pending',   -- pending|approved|rejected
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_status  ON user_submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_score   ON user_submissions(confidence_score);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON user_submissions(created_at DESC);

-- ════════════════════════════════════════════════════════════════════════════
-- TRIGGERS
-- ════════════════════════════════════════════════════════════════════════════

-- ── T1: Archive price to history whenever price_cents changes ───────────────
CREATE OR REPLACE FUNCTION fn_archive_price()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO price_history(product_id, store_id, price_cents, source)
  VALUES (OLD.product_id, OLD.store_id, OLD.price_cents, OLD.source);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_archive_price ON prices;
CREATE TRIGGER trg_archive_price
  BEFORE UPDATE ON prices
  FOR EACH ROW
  WHEN (OLD.price_cents IS DISTINCT FROM NEW.price_cents)
  EXECUTE FUNCTION fn_archive_price();

-- ── T2: Auto-stamp updated_at on stores/products ────────────────────────────
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stores_updated_at ON stores;
CREATE TRIGGER trg_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ── T3: Age-out stale scraper prices (> 7 days) ─────────────────────────────
-- Call via pg_cron or a nightly API route.
CREATE OR REPLACE FUNCTION fn_purge_stale_prices()
RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM prices
  WHERE source = 'scraper'
    AND last_updated < NOW() - INTERVAL '7 days';
END;
$$;

-- Optional: schedule with pg_cron if extension is enabled
-- SELECT cron.schedule('purge-stale-prices', '0 3 * * *', $$SELECT fn_purge_stale_prices()$$);

-- ════════════════════════════════════════════════════════════════════════════
-- VIEWS
-- ════════════════════════════════════════════════════════════════════════════

-- Convenience view: 30-day stats per (product, store) used by verify.ts
CREATE OR REPLACE VIEW v_price_stats_30d AS
SELECT
  product_id,
  store_id,
  AVG(price_cents)    AS mean_cents,
  STDDEV(price_cents) AS stddev_cents,
  COUNT(*)            AS sample_count,
  MIN(price_cents)    AS min_cents,
  MAX(price_cents)    AS max_cents
FROM price_history
WHERE recorded_at >= NOW() - INTERVAL '30 days'
GROUP BY product_id, store_id;

-- Convenience view: nearest stores enriched with distance (requires lat/lng params)
-- Usage: SELECT * FROM stores WHERE ST_DWithin(location, ST_MakePoint($lng,$lat)::geography, 25000);

-- ════════════════════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY (basic – harden before production)
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE stores           ENABLE ROW LEVEL SECURITY;
ALTER TABLE products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_submissions ENABLE ROW LEVEL SECURITY;

-- Public read for stores, products, prices
CREATE POLICY "public_read_stores"    ON stores    FOR SELECT USING (true);
CREATE POLICY "public_read_products"  ON products  FOR SELECT USING (true);
CREATE POLICY "public_read_prices"    ON prices    FOR SELECT USING (true);

-- Authenticated write for submissions
CREATE POLICY "anon_insert_submissions"
  ON user_submissions FOR INSERT
  WITH CHECK (true);   -- tighten to authenticated if auth is added

-- Service-role bypasses RLS automatically
