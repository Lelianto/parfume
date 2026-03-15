-- ============================================
-- Payment & Delivery Confirmation Flow
-- ============================================

-- 1. Add new enum values to order_status
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'pending_payment' BEFORE 'pending';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'paid' AFTER 'pending_payment';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'cancelled' AFTER 'completed';

-- 2. Add is_ready_stock to splits
ALTER TABLE public.splits ADD COLUMN IF NOT EXISTS is_ready_stock boolean NOT NULL DEFAULT false;

-- 3. Add payment/shipping columns to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_proof_url text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_deadline timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_deadline timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipped_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- 4. Change default order status to pending_payment
ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'pending_payment'::public.order_status;

-- 5. Update join_split function to use pending_payment + payment_deadline
CREATE OR REPLACE FUNCTION public.join_split(
  p_split_id uuid,
  p_user_id uuid,
  p_quantity integer
)
RETURNS uuid AS $$
DECLARE
  v_split record;
  v_order_id uuid;
BEGIN
  -- Lock the split row to prevent race conditions
  SELECT * INTO v_split
  FROM public.splits
  WHERE id = p_split_id
  FOR UPDATE;

  IF v_split IS NULL THEN
    RAISE EXCEPTION 'Split tidak ditemukan';
  END IF;

  IF v_split.status != 'open' THEN
    RAISE EXCEPTION 'Split sudah tidak menerima pesanan';
  END IF;

  IF v_split.filled_slots + p_quantity > v_split.total_slots THEN
    RAISE EXCEPTION 'Slot tidak cukup. Tersisa % slot.', v_split.total_slots - v_split.filled_slots;
  END IF;

  -- Create split slot
  INSERT INTO public.split_slots (split_id, user_id, quantity)
  VALUES (p_split_id, p_user_id, p_quantity);

  -- Create order with pending_payment status and 1-hour deadline
  INSERT INTO public.orders (user_id, split_id, slots_purchased, total_price, status, payment_deadline)
  VALUES (
    p_user_id,
    p_split_id,
    p_quantity,
    p_quantity * v_split.price_per_slot,
    'pending_payment'::public.order_status,
    now() + interval '1 hour'
  )
  RETURNING id INTO v_order_id;

  -- Update filled slots
  UPDATE public.splits
  SET filled_slots = filled_slots + p_quantity,
      status = CASE
        WHEN filled_slots + p_quantity >= total_slots THEN 'full'::public.split_status
        ELSE status
      END
  WHERE id = p_split_id;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function: cancel expired orders (pending_payment past deadline)
CREATE OR REPLACE FUNCTION public.cancel_expired_orders()
RETURNS integer AS $$
DECLARE
  v_count integer := 0;
  v_order record;
BEGIN
  FOR v_order IN
    SELECT o.id, o.split_id, o.slots_purchased
    FROM public.orders o
    WHERE o.status = 'pending_payment'
      AND o.payment_deadline < now()
    FOR UPDATE OF o
  LOOP
    -- Cancel the order
    UPDATE public.orders
    SET status = 'cancelled'::public.order_status
    WHERE id = v_order.id;

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

-- 7. Function: auto-complete shipped orders (2 days after shipped)
CREATE OR REPLACE FUNCTION public.auto_complete_orders()
RETURNS integer AS $$
DECLARE
  v_count integer := 0;
BEGIN
  UPDATE public.orders
  SET status = 'completed'::public.order_status,
      completed_at = now()
  WHERE status = 'shipped'
    AND shipping_deadline < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RLS: buyer can update payment_proof_url on own order
CREATE POLICY "Orders: buyer can update own" ON public.orders
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 9. Storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment_proofs', 'payment_proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for payment_proofs bucket
CREATE POLICY "Payment proofs: authenticated can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'payment_proofs'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Payment proofs: anyone can read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'payment_proofs');

-- 10. Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_deadline ON public.orders(payment_deadline) WHERE status = 'pending_payment';
CREATE INDEX IF NOT EXISTS idx_orders_shipping_deadline ON public.orders(shipping_deadline) WHERE status = 'shipped';
