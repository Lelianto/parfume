-- ============================================================
-- Migration 019: RajaOngkir destination cache + feature toggles
-- ============================================================

-- 1. RajaOngkir destination cache table (subdistrict-level)
-- ID = RajaOngkir domestic destination ID (used for cost calculation)
CREATE TABLE IF NOT EXISTS rajaongkir_cities (
  id integer PRIMARY KEY,               -- RajaOngkir subdistrict ID
  province_name text NOT NULL,
  city_name text NOT NULL,
  district_name text NOT NULL,
  subdistrict_name text NOT NULL,
  zip_code text,
  label text,                            -- full label from RajaOngkir
  fetched_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rajaongkir_cities_subdistrict
  ON rajaongkir_cities (upper(subdistrict_name));
CREATE INDEX IF NOT EXISTS idx_rajaongkir_cities_city
  ON rajaongkir_cities (upper(city_name));

ALTER TABLE rajaongkir_cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read rajaongkir_cities"
  ON rajaongkir_cities FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can manage rajaongkir_cities"
  ON rajaongkir_cities FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- 2. Platform feature toggles
CREATE TABLE IF NOT EXISTS platform_features (
  feature text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE platform_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read platform_features"
  ON platform_features FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can manage platform_features"
  ON platform_features FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Seed default toggles (OFF)
INSERT INTO platform_features (feature, enabled) VALUES
  ('delivery_api', false),
  ('payment_api', false)
ON CONFLICT (feature) DO NOTHING;

-- 3. Add destination_id columns to users (RajaOngkir subdistrict ID)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS store_city_id integer,
  ADD COLUMN IF NOT EXISTS address_city_id integer;

-- 4. Add destination_id column to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipping_city_id integer;
