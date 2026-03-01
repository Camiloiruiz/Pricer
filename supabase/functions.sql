-- ════════════════════════════════════════════════════════════════════════════
-- Sertch · Supabase RPC functions
-- Run after schema.sql
-- ════════════════════════════════════════════════════════════════════════════

-- ── nearby_stores ──────────────────────────────────────────────────────────
-- Returns stores within radius_m metres of (user_lat, user_lng),
-- ordered by ascending distance.  Exposed via Supabase .rpc('nearby_stores').
--
-- Usage:
--   SELECT * FROM nearby_stores(43.7834, -79.9290, 25000);
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION nearby_stores(
  user_lat  DOUBLE PRECISION,
  user_lng  DOUBLE PRECISION,
  radius_m  INTEGER DEFAULT 25000
)
RETURNS TABLE (
  id           UUID,
  name         TEXT,
  chain        TEXT,
  address      TEXT,
  city         TEXT,
  province     TEXT,
  postal_code  TEXT,
  phone        TEXT,
  lat          DOUBLE PRECISION,
  lng          DOUBLE PRECISION,
  distance_m   DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    s.id,
    s.name,
    s.chain,
    s.address,
    s.city,
    s.province,
    s.postal_code,
    s.phone,
    ST_Y(s.location::geometry)   AS lat,
    ST_X(s.location::geometry)   AS lng,
    ST_Distance(
      s.location,
      ST_MakePoint(user_lng, user_lat)::geography
    )                             AS distance_m
  FROM stores s
  WHERE ST_DWithin(
    s.location,
    ST_MakePoint(user_lng, user_lat)::geography,
    radius_m
  )
  ORDER BY distance_m ASC;
$$;

-- Grant execute to anon and authenticated roles
GRANT EXECUTE ON FUNCTION nearby_stores(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER)
  TO anon, authenticated;

-- ── insert_store_with_coords ───────────────────────────────────────────────
-- Helper for inserting a store given plain lat/lng floats.
-- Usage: SELECT insert_store_with_coords('Loblaws Shelburne', 'loblaws',
--          '141 Owen Sound St', 'Shelburne', 'ON', 'L9V 3L5',
--          44.0763, -80.2025);
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION insert_store_with_coords(
  p_name        TEXT,
  p_chain       TEXT,
  p_address     TEXT,
  p_city        TEXT,
  p_province    TEXT DEFAULT 'ON',
  p_postal_code TEXT DEFAULT NULL,
  p_lat         DOUBLE PRECISION DEFAULT 0,
  p_lng         DOUBLE PRECISION DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO stores (name, chain, address, city, province, postal_code, location)
  VALUES (
    p_name, p_chain, p_address, p_city, p_province, p_postal_code,
    ST_MakePoint(p_lng, p_lat)::geography
  )
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION insert_store_with_coords(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,DOUBLE PRECISION,DOUBLE PRECISION)
  TO service_role;

-- ── Seed Ontario stores ────────────────────────────────────────────────────
-- Run once after functions are created.
-- Shelburne + GTA sample stores.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM stores LIMIT 1) THEN
    PERFORM insert_store_with_coords('Loblaws Shelburne',          'loblaws',   '141 Owen Sound St',       'Shelburne',   'ON', 'L9V 3L5', 44.0763, -80.2025);
    PERFORM insert_store_with_coords('No Frills Shelburne',        'no_frills', '177 Owen Sound St Unit 1','Shelburne',   'ON', 'L9V 3L5', 44.0759, -80.2011);
    PERFORM insert_store_with_coords('Walmart Supercentre Barrie', 'walmart',   '400 Bayfield St',         'Barrie',      'ON', 'L4M 5A1', 44.3894, -79.6900);
    PERFORM insert_store_with_coords('Loblaws Maple',              'loblaws',   '9625 Keele St',           'Vaughan',     'ON', 'L6A 3Y5', 43.8452, -79.5312);
    PERFORM insert_store_with_coords('No Frills Brampton',         'no_frills', '180 Bovaird Dr E',        'Brampton',    'ON', 'L6Z 1K1', 43.7308, -79.7690);
    PERFORM insert_store_with_coords('Metro Mississauga',          'metro',     '3025 Hurontario St',      'Mississauga', 'ON', 'L5A 2G3', 43.5817, -79.6259);
    PERFORM insert_store_with_coords('FreshCo Etobicoke',         'freshco',   '4141 Dundas St W',        'Toronto',     'ON', 'M8X 1Y2', 43.6525, -79.5011);
  END IF;
END;
$$;
