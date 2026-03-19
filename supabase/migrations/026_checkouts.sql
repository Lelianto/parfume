-- Checkouts: parent entity spanning ALL sellers in one checkout transaction
-- Like Shopee/Tokopedia: single payment for items from multiple sellers
CREATE TABLE checkouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  status order_status DEFAULT 'pending_payment',
  -- Shared shipping address (same for all seller groups)
  shipping_name text,
  shipping_phone text,
  shipping_province text,
  shipping_city text,
  shipping_district text,
  shipping_village text,
  shipping_postal_code text,
  shipping_address text,
  shipping_city_id integer,
  -- Payment (single payment for all sellers)
  grand_total integer NOT NULL DEFAULT 0, -- total_product + total_shipping
  total_product_price integer NOT NULL DEFAULT 0,
  total_shipping_cost integer NOT NULL DEFAULT 0,
  payment_proof_url text,
  payment_deadline timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Link order_groups to checkout
ALTER TABLE order_groups ADD COLUMN checkout_id uuid REFERENCES checkouts(id);
CREATE INDEX idx_order_groups_checkout_id ON order_groups(checkout_id);

-- RLS for checkouts
ALTER TABLE checkouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkouts"
  ON checkouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checkouts"
  ON checkouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own checkouts"
  ON checkouts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage checkouts"
  ON checkouts FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Index
CREATE INDEX idx_checkouts_user_id ON checkouts(user_id);
CREATE INDEX idx_checkouts_status ON checkouts(status);

-- RPC: Multi-seller checkout - creates checkout + order_groups + orders atomically
CREATE OR REPLACE FUNCTION checkout_multi_seller(
  p_user_id uuid,
  p_seller_groups jsonb -- array of { seller_id, items: [{ variant_id, quantity }] }
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_checkout_id uuid;
  v_group jsonb;
  v_group_id uuid;
  v_item jsonb;
  v_variant record;
  v_split record;
  v_order_id uuid;
  v_group_total integer;
  v_grand_total integer := 0;
  v_item_price integer;
  v_seller_id uuid;
BEGIN
  -- Create the checkout (parent)
  INSERT INTO checkouts (user_id, status, payment_deadline)
  VALUES (p_user_id, 'pending_payment', now() + interval '1 hour')
  RETURNING id INTO v_checkout_id;

  -- Process each seller group
  FOR v_group IN SELECT * FROM jsonb_array_elements(p_seller_groups)
  LOOP
    v_seller_id := (v_group->>'seller_id')::uuid;
    v_group_total := 0;

    -- Create order_group for this seller
    INSERT INTO order_groups (user_id, seller_id, status, payment_deadline, checkout_id)
    VALUES (p_user_id, v_seller_id, 'pending_payment', now() + interval '1 hour', v_checkout_id)
    RETURNING id INTO v_group_id;

    -- Process items for this seller
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_group->'items')
    LOOP
      -- Lock and fetch variant
      SELECT * INTO v_variant
      FROM split_variants
      WHERE id = (v_item->>'variant_id')::uuid
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Variant % tidak ditemukan', v_item->>'variant_id';
      END IF;

      -- Check stock
      IF v_variant.stock - v_variant.sold < (v_item->>'quantity')::int THEN
        RAISE EXCEPTION 'Stok tidak cukup untuk variant %', v_variant.id;
      END IF;

      -- Lock and fetch split
      SELECT * INTO v_split
      FROM splits
      WHERE id = v_variant.split_id
      FOR UPDATE;

      IF v_split.is_hidden THEN
        RAISE EXCEPTION 'Split % tidak tersedia', v_split.id;
      END IF;

      -- Verify seller matches
      IF v_split.created_by != v_seller_id THEN
        RAISE EXCEPTION 'Seller mismatch untuk split %', v_split.id;
      END IF;

      v_item_price := v_variant.price * (v_item->>'quantity')::int;
      v_group_total := v_group_total + v_item_price;

      -- Update variant sold count
      UPDATE split_variants
      SET sold = sold + (v_item->>'quantity')::int
      WHERE id = v_variant.id;

      -- Create split_slot
      INSERT INTO split_slots (split_id, user_id, quantity)
      VALUES (v_split.id, p_user_id, (v_item->>'quantity')::int);

      -- Create order linked to group
      INSERT INTO orders (
        user_id, split_id, variant_id, size_ml,
        slots_purchased, total_price, status,
        payment_deadline, order_group_id
      ) VALUES (
        p_user_id, v_split.id, v_variant.id, v_variant.size_ml,
        (v_item->>'quantity')::int, v_item_price, 'pending_payment',
        now() + interval '1 hour', v_group_id
      )
      RETURNING id INTO v_order_id;

      -- Update split filled_slots
      UPDATE splits
      SET filled_slots = (
            SELECT COALESCE(SUM(sold), 0) FROM split_variants WHERE split_id = v_split.id
          ),
          status = CASE
            WHEN (SELECT COALESCE(SUM(sold), 0) FROM split_variants WHERE split_id = v_split.id) >=
                 (SELECT COALESCE(SUM(stock), 0) FROM split_variants WHERE split_id = v_split.id)
            THEN 'full'::split_status
            ELSE status
          END
      WHERE id = v_split.id;
    END LOOP;

    -- Update group total
    UPDATE order_groups
    SET total_product_price = v_group_total
    WHERE id = v_group_id;

    v_grand_total := v_grand_total + v_group_total;
  END LOOP;

  -- Update checkout total
  UPDATE checkouts
  SET total_product_price = v_grand_total,
      grand_total = v_grand_total
  WHERE id = v_checkout_id;

  RETURN v_checkout_id;
END;
$$;
