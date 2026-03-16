-- Cart items stored in database (synced across devices)
CREATE TABLE cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  split_id uuid NOT NULL REFERENCES splits(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES split_variants(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz DEFAULT now(),
  -- Prevent duplicate split+variant per user
  UNIQUE (user_id, split_id, variant_id)
);

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own cart"
  ON cart_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);

-- Cleanup function: delete cart items older than 7 days
CREATE OR REPLACE FUNCTION cleanup_expired_cart_items()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM cart_items
  WHERE created_at < now() - interval '7 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
