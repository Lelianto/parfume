-- Allow purchases as long as variant has stock and split is not hidden
-- Previously blocked by: IF v_split.status != 'open'

-- Update join_split_v2
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

  -- Only block if hidden
  IF v_split.is_hidden THEN
    RAISE EXCEPTION 'Split ini sedang tidak tersedia';
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


-- Update join_split_batch
CREATE OR REPLACE FUNCTION join_split_batch(
  p_user_id uuid,
  p_seller_id uuid,
  p_items jsonb
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

    -- Only block if hidden
    IF v_split.is_hidden THEN
      RAISE EXCEPTION 'Split % sedang tidak tersedia', v_split.id;
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
    SET filled_slots = (
          SELECT COALESCE(SUM(sold), 0) FROM split_variants WHERE split_id = v_split.id
        ),
        status = CASE
          WHEN (SELECT COALESCE(SUM(sold), 0) FROM split_variants WHERE split_id = v_split.id)
               >= (SELECT COALESCE(SUM(stock), 0) FROM split_variants WHERE split_id = v_split.id)
          THEN 'full'::split_status
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
