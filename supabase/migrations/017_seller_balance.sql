-- 017: Seller Balance & Withdrawal System
-- Order completed → saldo seller auto-credit → seller tarik dana → admin approve

-- 1. Seller Balances table (one row per seller)
CREATE TABLE IF NOT EXISTS public.seller_balances (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance bigint NOT NULL DEFAULT 0,
  total_earned bigint NOT NULL DEFAULT 0,
  total_withdrawn bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_balances ENABLE ROW LEVEL SECURITY;

-- Seller can read own balance
CREATE POLICY "seller_balances: read own" ON public.seller_balances
  FOR SELECT USING (auth.uid() = user_id);

-- Admin can read all balances
CREATE POLICY "seller_balances: admin read all" ON public.seller_balances
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

-- Admin can update balances
CREATE POLICY "seller_balances: admin update" ON public.seller_balances
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

-- Service role / functions can insert & update (via SECURITY DEFINER functions)
CREATE POLICY "seller_balances: insert own" ON public.seller_balances
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "seller_balances: update own" ON public.seller_balances
  FOR UPDATE USING (auth.uid() = user_id);

-- 2. Withdrawals table
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount bigint NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  bank_name text NOT NULL,
  bank_account_number text NOT NULL,
  bank_account_name text NOT NULL,
  admin_note text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  completed_at timestamptz
);

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- Seller can read own withdrawals
CREATE POLICY "withdrawals: read own" ON public.withdrawals
  FOR SELECT USING (auth.uid() = user_id);

-- Seller can insert own withdrawals
CREATE POLICY "withdrawals: insert own" ON public.withdrawals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin can read all withdrawals
CREATE POLICY "withdrawals: admin read all" ON public.withdrawals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

-- Admin can update withdrawals
CREATE POLICY "withdrawals: admin update" ON public.withdrawals
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

-- 3. Function: credit seller balance when order is completed
CREATE OR REPLACE FUNCTION public.credit_seller_balance(
  p_order_id uuid,
  p_seller_id uuid,
  p_amount bigint
)
RETURNS void AS $$
BEGIN
  -- Upsert seller balance
  INSERT INTO public.seller_balances (user_id, balance, total_earned, updated_at)
  VALUES (p_seller_id, p_amount, p_amount, now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    balance = seller_balances.balance + p_amount,
    total_earned = seller_balances.total_earned + p_amount,
    updated_at = now();

  -- Mark order disbursement as credited
  UPDATE public.orders
  SET disbursement_status = 'credited'
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update auto_complete_orders to also credit seller balance
CREATE OR REPLACE FUNCTION public.auto_complete_orders()
RETURNS integer AS $$
DECLARE
  v_count integer := 0;
  v_order RECORD;
BEGIN
  FOR v_order IN
    SELECT o.id, o.total_price, s.created_by AS seller_id
    FROM public.orders o
    JOIN public.splits s ON s.id = o.split_id
    WHERE o.status = 'shipped'
      AND o.shipping_deadline < now()
  LOOP
    -- Update order status
    UPDATE public.orders
    SET status = 'completed'::public.order_status,
        completed_at = now(),
        disbursement_status = 'credited'
    WHERE id = v_order.id;

    -- Credit seller balance
    PERFORM public.credit_seller_balance(v_order.id, v_order.seller_id, v_order.total_price);

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Data migration: existing completed orders with disbursement_status = 'pending' → credit to seller balances
DO $$
DECLARE
  v_order RECORD;
BEGIN
  FOR v_order IN
    SELECT o.id, o.total_price, s.created_by AS seller_id
    FROM public.orders o
    JOIN public.splits s ON s.id = o.split_id
    WHERE o.status = 'completed'
      AND o.disbursement_status = 'pending'
  LOOP
    PERFORM public.credit_seller_balance(v_order.id, v_order.seller_id, v_order.total_price);
  END LOOP;
END;
$$;
