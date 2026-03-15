-- ============================================
-- Split Variants: Multiple sizes per split
-- ============================================

-- 1. New table: split_variants
CREATE TABLE public.split_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id uuid NOT NULL REFERENCES public.splits(id) ON DELETE CASCADE,
  size_ml integer NOT NULL,
  price integer NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  sold integer NOT NULL DEFAULT 0,
  CONSTRAINT valid_variant CHECK (size_ml > 0 AND price > 0 AND stock >= 0 AND sold >= 0 AND sold <= stock),
  UNIQUE(split_id, size_ml)
);

ALTER TABLE public.split_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Variants: anyone can read" ON public.split_variants
  FOR SELECT USING (true);

CREATE POLICY "Variants: authenticated can create" ON public.split_variants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.splits
      WHERE splits.id = split_variants.split_id
      AND splits.created_by = auth.uid()
    )
  );

CREATE POLICY "Variants: creator can update" ON public.split_variants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.splits
      WHERE splits.id = split_variants.split_id
      AND splits.created_by = auth.uid()
    )
  );

-- 2. Add variant_id and size_ml to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.split_variants(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS size_ml integer;

-- 3. Migrate existing splits: create 1 variant per existing split
INSERT INTO public.split_variants (split_id, size_ml, price, stock, sold)
SELECT id, split_size_ml, price_per_slot, total_slots, filled_slots
FROM public.splits;

-- 4. Backfill existing orders with variant info
UPDATE public.orders o
SET variant_id = v.id,
    size_ml = v.size_ml
FROM public.split_variants v
WHERE v.split_id = o.split_id;

-- 5. New function: join_split_v2 (variant-aware)
CREATE OR REPLACE FUNCTION public.join_split_v2(
  p_variant_id uuid,
  p_user_id uuid,
  p_quantity integer
)
RETURNS uuid AS $$
DECLARE
  v_variant record;
  v_split record;
  v_order_id uuid;
  v_total_sold integer;
  v_total_stock integer;
BEGIN
  -- Lock the variant row
  SELECT * INTO v_variant
  FROM public.split_variants
  WHERE id = p_variant_id
  FOR UPDATE;

  IF v_variant IS NULL THEN
    RAISE EXCEPTION 'Variant tidak ditemukan';
  END IF;

  -- Lock the split row
  SELECT * INTO v_split
  FROM public.splits
  WHERE id = v_variant.split_id
  FOR UPDATE;

  IF v_split IS NULL THEN
    RAISE EXCEPTION 'Split tidak ditemukan';
  END IF;

  IF v_split.status != 'open' THEN
    RAISE EXCEPTION 'Split sudah tidak menerima pesanan';
  END IF;

  IF v_variant.sold + p_quantity > v_variant.stock THEN
    RAISE EXCEPTION 'Stok tidak cukup. Tersisa % unit.', v_variant.stock - v_variant.sold;
  END IF;

  -- Update variant sold count
  UPDATE public.split_variants
  SET sold = sold + p_quantity
  WHERE id = p_variant_id;

  -- Create split slot
  INSERT INTO public.split_slots (split_id, user_id, quantity)
  VALUES (v_variant.split_id, p_user_id, p_quantity);

  -- Create order with variant info
  INSERT INTO public.orders (
    user_id, split_id, variant_id, size_ml,
    slots_purchased, total_price,
    status, payment_deadline
  )
  VALUES (
    p_user_id,
    v_variant.split_id,
    p_variant_id,
    v_variant.size_ml,
    p_quantity,
    p_quantity * v_variant.price,
    'pending_payment'::public.order_status,
    now() + interval '1 hour'
  )
  RETURNING id INTO v_order_id;

  -- Update split filled_slots (sum of all variants' sold)
  SELECT COALESCE(SUM(sold), 0), COALESCE(SUM(stock), 0)
  INTO v_total_sold, v_total_stock
  FROM public.split_variants
  WHERE split_id = v_variant.split_id;

  UPDATE public.splits
  SET filled_slots = v_total_sold,
      total_slots = v_total_stock,
      status = CASE
        WHEN v_total_sold >= v_total_stock THEN 'full'::public.split_status
        ELSE status
      END
  WHERE id = v_variant.split_id;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Update cancel_expired_orders to handle variants
CREATE OR REPLACE FUNCTION public.cancel_expired_orders()
RETURNS integer AS $$
DECLARE
  v_count integer := 0;
  v_order record;
BEGIN
  FOR v_order IN
    SELECT o.id, o.split_id, o.slots_purchased, o.variant_id
    FROM public.orders o
    WHERE o.status = 'pending_payment'
      AND o.payment_deadline < now()
    FOR UPDATE OF o
  LOOP
    -- Cancel the order
    UPDATE public.orders
    SET status = 'cancelled'::public.order_status
    WHERE id = v_order.id;

    -- Return stock to variant if variant_id exists
    IF v_order.variant_id IS NOT NULL THEN
      UPDATE public.split_variants
      SET sold = GREATEST(0, sold - v_order.slots_purchased)
      WHERE id = v_order.variant_id;
    END IF;

    -- Return slots to split
    UPDATE public.splits
    SET filled_slots = GREATEST(0, filled_slots - v_order.slots_purchased),
        status = 'open'::public.split_status
    WHERE id = v_order.split_id;

    -- Remove split slot
    DELETE FROM public.split_slots
    WHERE split_id = v_order.split_id
      AND user_id = (SELECT user_id FROM public.orders WHERE id = v_order.id);

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_split_variants_split_id ON public.split_variants(split_id);
CREATE INDEX IF NOT EXISTS idx_orders_variant_id ON public.orders(variant_id);
