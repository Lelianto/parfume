-- 016: Escrow System — buyer pays to platform (Wangiverse), admin disburses to seller

-- 1. Platform Settings table (single-row, id=1)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  bank_name text,
  bank_account_number text,
  bank_account_name text,
  updated_at timestamptz DEFAULT now()
);

-- Insert default row
INSERT INTO public.platform_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read (buyer needs to see bank info)
CREATE POLICY "platform_settings: public read" ON public.platform_settings
  FOR SELECT USING (true);

-- Only admin can update
CREATE POLICY "platform_settings: admin update" ON public.platform_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

-- 2. Add escrow columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS disbursement_status text,
  ADD COLUMN IF NOT EXISTS disbursed_at timestamptz;

-- 3. Update auto_complete_orders to set disbursement_status = 'pending'
CREATE OR REPLACE FUNCTION public.auto_complete_orders()
RETURNS integer AS $$
DECLARE
  v_count integer := 0;
BEGIN
  UPDATE public.orders
  SET status = 'completed'::public.order_status,
      completed_at = now(),
      disbursement_status = 'pending'
  WHERE status = 'shipped'
    AND shipping_deadline < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Data migration: existing completed orders → mark as disbursed (already paid directly to seller)
UPDATE public.orders
SET disbursement_status = 'disbursed',
    disbursed_at = completed_at
WHERE status = 'completed'
  AND disbursement_status IS NULL;
