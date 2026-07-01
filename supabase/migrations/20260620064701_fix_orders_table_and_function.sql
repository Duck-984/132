-- Add missing columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id uuid;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transaction_id text;

-- Update the create_order_with_stock function to handle the new columns
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
BEGIN
  -- Generate order ID
  v_order_id := 'ord-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 6);

  -- Deduct stock for each item atomically
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := v_item->>'productId';
    v_quantity := (v_item->>'quantity')::int;

    UPDATE products
    SET stock = GREATEST(0, stock - v_quantity),
        updated_at = now()
    WHERE id = v_product_id::uuid
    RETURNING stock INTO v_new_stock;

    IF v_new_stock IS NULL THEN
      RAISE EXCEPTION 'Product % not found', v_product_id;
    END IF;

    IF v_new_stock < 0 THEN
      RAISE EXCEPTION 'Insufficient stock for product %', v_product_id;
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
    p_items,
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