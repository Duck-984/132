-- Final setup: ensure storage bucket, all RPC functions, and missing pieces exist

-- 1. Storage bucket for product images and review photos
-- This is handled via Supabase Dashboard or Storage API, not SQL.
-- Run this in Supabase SQL Editor to create the bucket:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true)
-- ON CONFLICT (id) DO NOTHING;

-- 2. Storage policies for product-images bucket
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Product images public read' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Product images public read"
      ON storage.objects FOR SELECT
      TO anon, authenticated
      USING (bucket_id = 'product-images');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Product images upload' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Product images upload"
      ON storage.objects FOR INSERT
      TO anon, authenticated
      WITH CHECK (bucket_id = 'product-images');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Product images delete' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Product images delete"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'product-images');
  END IF;
END $$;

-- 3. Ensure increment_views function exists (used by ProductDetail)
CREATE OR REPLACE FUNCTION increment_views(p_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE products SET views = views + 1 WHERE id = p_id;
END;
$$;

-- 4. Ensure append_order_status function exists (used by Orders)
CREATE OR REPLACE FUNCTION append_order_status(
  p_order_id text,
  p_status text,
  p_changed_by text,
  p_note text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  UPDATE orders
  SET status = p_status,
      status_history = status_history || jsonb_build_array(
        jsonb_build_object(
          'status', p_status,
          'changed_at', now()::text,
          'changed_by', p_changed_by,
          'note', p_note
        )
      ),
      updated_at = now()
  WHERE id = p_order_id
  RETURNING jsonb_build_object(
    'id', id,
    'status', status,
    'total_amount', total_amount,
    'status_history', status_history,
    'customer_info', customer_info,
    'delivery_type', delivery_type,
    'delivery_cost', delivery_cost,
    'payment_method', payment_method,
    'notes', notes,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 5. Ensure adjust_stock function exists (used by inventory)
CREATE OR REPLACE FUNCTION adjust_stock(p_product_id uuid, p_delta int)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_stock int;
BEGIN
  UPDATE products
  SET stock = GREATEST(0, stock + p_delta),
      updated_at = now()
  WHERE id = p_product_id
  RETURNING stock INTO v_new_stock;

  IF v_new_stock IS NULL THEN
    RAISE EXCEPTION 'Product % not found', p_product_id;
  END IF;

  RETURN jsonb_build_object('id', p_product_id, 'stock', v_new_stock);
END;
$$;

-- 6. Ensure update_updated_at_column trigger exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 7. Ensure verify_admin_password function exists
CREATE OR REPLACE FUNCTION verify_admin_password(p_email text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin RECORD;
  v_valid boolean := false;
BEGIN
  SELECT id, email, first_name, role, password_hash, is_active
  INTO v_admin
  FROM admin_accounts
  WHERE email = lower(trim(p_email))
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Admin not found');
  END IF;

  -- Check bcrypt hash match, fall back to plain text for legacy accounts
  IF v_admin.password_hash LIKE '$2%' THEN
    IF extensions.crypt(p_password, v_admin.password_hash) = v_admin.password_hash THEN
      v_valid := true;
    END IF;
  ELSIF v_admin.password_hash = p_password THEN
    v_valid := true;
  END IF;

  IF NOT v_valid THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid password');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'id', v_admin.id,
    'email', v_admin.email,
    'first_name', v_admin.first_name,
    'role', v_admin.role
  );
END;
$$;

-- 8. Trigger for updated_at on all tables that need it
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_products_updated_at') THEN
    CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_orders_updated_at') THEN
    CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
    CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_banners_updated_at') THEN
    CREATE TRIGGER update_banners_updated_at BEFORE UPDATE ON banners
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_delivery_zones_updated_at') THEN
    CREATE TRIGGER update_delivery_zones_updated_at BEFORE UPDATE ON delivery_zones
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_coupons_updated_at') THEN
    CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON coupons
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_returns_updated_at') THEN
    CREATE TRIGGER update_returns_updated_at BEFORE UPDATE ON returns
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_admin_accounts_updated_at') THEN
    CREATE TRIGGER update_admin_accounts_updated_at BEFORE UPDATE ON admin_accounts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_reviews_updated_at') THEN
    CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_promotions_updated_at') THEN
    CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON promotions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_product_collections_updated_at') THEN
    CREATE TRIGGER update_product_collections_updated_at BEFORE UPDATE ON product_collections
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
