-- Fix the create_order_with_stock function to handle JSON parsing correctly
CREATE OR REPLACE FUNCTION create_order_with_stock(
  p_telegram_user_id bigint,
  p_items jsonb,
  p_total_amount numeric,
  p_customer_info jsonb,
  p_delivery_type text,
  p_delivery_cost numeric,
  p_payment_method text,
  p_notes text,
  p_coupon_id uuid,
  p_discount_amount numeric,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id text;
  v_item jsonb;
  v_product_id text;
  v_quantity int;
  v_new_stock int;
  v_result jsonb;
  v_items_array jsonb;
BEGIN
  -- Generate order ID
  v_order_id := 'ord-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 6);

  -- Handle items - if it's a string, parse it; if it's already jsonb, use directly
  IF jsonb_typeof(p_items) = 'string' THEN
    v_items_array := p_items::text::jsonb;
  ELSE
    v_items_array := p_items;
  END IF;

  -- Deduct stock for each item atomically
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items_array)
  LOOP
    v_product_id := v_item->>'productId';
    v_quantity := COALESCE((v_item->>'quantity')::int, 1);

    UPDATE products
    SET stock = GREATEST(0, stock - v_quantity),
        updated_at = now()
    WHERE id = v_product_id::uuid
    RETURNING stock INTO v_new_stock;

    IF v_new_stock IS NULL THEN
      RAISE EXCEPTION 'Product % not found', v_product_id;
    END IF;
  END LOOP;

  -- Create the order
  INSERT INTO orders (
    id,
    telegram_user_id,
    items,
    total_amount,
    status,
    customer_info,
    delivery_type,
    delivery_cost,
    payment_method,
    notes,
    coupon_id,
    discount_amount,
    created_at,
    updated_at,
    status_history
  ) VALUES (
    v_order_id,
    p_telegram_user_id,
    v_items_array,
    p_total_amount,
    p_status,
    p_customer_info,
    p_delivery_type,
    p_delivery_cost,
    p_payment_method,
    p_notes,
    p_coupon_id,
    p_discount_amount,
    now(),
    now(),
    jsonb_build_array(
      jsonb_build_object(
        'status', p_status,
        'changed_at', now()::text,
        'changed_by', 'System'
      )
    )
  )
  RETURNING jsonb_build_object(
    'id', id,
    'status', status,
    'total_amount', total_amount
  ) INTO v_result;

  RETURN v_result;
END;
$$;