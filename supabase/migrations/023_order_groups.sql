-- Order Groups: group multiple orders from same seller into one checkout
CREATE TABLE order_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  seller_id uuid NOT NULL REFERENCES auth.users(id),
  status order_status DEFAULT 'pending_payment',
  total_product_price integer NOT NULL DEFAULT 0,
  shipping_cost integer NOT NULL DEFAULT 0,
  shipping_courier text,
  shipping_service text,
  shipping_receipt text,
  payment_proof_url text,
  payment_deadline timestamptz,
  -- Shared shipping address
  shipping_name text,
  shipping_phone text,
  shipping_province text,
  shipping_city text,
  shipping_district text,
  shipping_village text,
  shipping_postal_code text,
  shipping_address text,
  shipping_city_id integer,
  created_at timestamptz DEFAULT now()
);

-- Add order_group_id to orders
ALTER TABLE orders ADD COLUMN order_group_id uuid REFERENCES order_groups(id);

-- RLS policies for order_groups
ALTER TABLE order_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own order groups"
  ON order_groups FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = seller_id);

CREATE POLICY "Users can insert own order groups"
  ON order_groups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own order groups"
  ON order_groups FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = seller_id);

-- Admin can do everything
CREATE POLICY "Admins can manage order groups"
  ON order_groups FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Index for fast lookups
CREATE INDEX idx_order_groups_user_id ON order_groups(user_id);
CREATE INDEX idx_order_groups_seller_id ON order_groups(seller_id);
CREATE INDEX idx_orders_order_group_id ON orders(order_group_id);

-- RPC: Batch join split - creates order group + individual orders atomically
CREATE OR REPLACE FUNCTION join_split_batch(
  p_user_id uuid,
  p_seller_id uuid,
  p_items jsonb -- array of { variant_id, quantity }
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_group_id uuid;
  v_item jsonb;
  v_variant record;
  v_split record;
  v_order_id uuid;
  v_total_price integer := 0;
  v_item_price integer;
BEGIN
  -- Create the order group
  INSERT INTO order_groups (user_id, seller_id, status, payment_deadline)
  VALUES (p_user_id, p_seller_id, 'pending_payment', now() + interval '1 hour')
  RETURNING id INTO v_group_id;

  -- Process each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
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

    IF v_split.status != 'open' THEN
      RAISE EXCEPTION 'Split % tidak lagi terbuka', v_split.id;
    END IF;

    -- Verify seller matches
    IF v_split.created_by != p_seller_id THEN
      RAISE EXCEPTION 'Seller mismatch untuk split %', v_split.id;
    END IF;

    v_item_price := v_variant.price * (v_item->>'quantity')::int;
    v_total_price := v_total_price + v_item_price;

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
    SET filled_slots = filled_slots + (v_item->>'quantity')::int,
        status = CASE
          WHEN filled_slots + (v_item->>'quantity')::int >= total_slots THEN 'full'::split_status
          ELSE status
        END
    WHERE id = v_split.id;
  END LOOP;

  -- Update group total
  UPDATE order_groups
  SET total_product_price = v_total_price
  WHERE id = v_group_id;

  RETURN v_group_id;
END;
$$;
