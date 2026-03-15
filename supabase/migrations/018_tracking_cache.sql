-- Add shipping columns to orders (courier chosen by buyer, cost = ongkir)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_courier text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_service text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost integer DEFAULT 0;

-- Tracking cache table
CREATE TABLE IF NOT EXISTS tracking_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  awb text NOT NULL,
  courier text NOT NULL,
  result jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(awb, courier)
);

-- API usage counter (per month, per type)
-- type: 'tracking' or 'ongkir'
CREATE TABLE IF NOT EXISTS api_usage (
  month text NOT NULL,       -- e.g. '2026-03'
  api_type text NOT NULL,    -- 'tracking' or 'ongkir'
  request_count int NOT NULL DEFAULT 0,
  PRIMARY KEY (month, api_type)
);

-- RLS
ALTER TABLE tracking_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read tracking cache"
  ON tracking_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can read api usage"
  ON api_usage FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Atomic: reserve quota slot, returns new count. Raises exception if over limit.
CREATE OR REPLACE FUNCTION reserve_api_quota(
  p_api_type text,
  p_limit int
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count int;
BEGIN
  INSERT INTO api_usage (month, api_type, request_count)
  VALUES (to_char(now(), 'YYYY-MM'), p_api_type, 1)
  ON CONFLICT (month, api_type)
  DO UPDATE SET request_count = api_usage.request_count + 1
  RETURNING request_count INTO v_count;

  IF v_count > p_limit THEN
    -- Rollback the increment
    UPDATE api_usage
    SET request_count = request_count - 1
    WHERE month = to_char(now(), 'YYYY-MM') AND api_type = p_api_type;
    RAISE EXCEPTION 'API quota exceeded for %', p_api_type;
  END IF;

  RETURN v_count;
END;
$$;

-- Upsert tracking cache (no quota logic, just cache)
CREATE OR REPLACE FUNCTION upsert_tracking_cache(
  p_awb text,
  p_courier text,
  p_result jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO tracking_cache (awb, courier, result, fetched_at)
  VALUES (p_awb, p_courier, p_result, now())
  ON CONFLICT (awb, courier)
  DO UPDATE SET result = p_result, fetched_at = now();
END;
$$;
