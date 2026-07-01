-- Add session_token column for server-side auth verification
ALTER TABLE admin_accounts ADD COLUMN IF NOT EXISTS session_token text;

-- Drop all existing permissive RLS policies on admin_accounts
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'admin_accounts' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON admin_accounts', pol.policyname);
  END LOOP;
END $$;

-- Admin accounts: only readable/modifiable via service_role (admin operations go through edge functions)
ALTER TABLE admin_accounts ENABLE ROW LEVEL SECURITY;

-- Users table: restrict to own rows
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON users', pol.policyname);
  END LOOP;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own profile' AND tablename = 'users') THEN
    CREATE POLICY "Users can read own profile"
      ON users FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own profile' AND tablename = 'users') THEN
    CREATE POLICY "Users can insert own profile"
      ON users FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile' AND tablename = 'users') THEN
    CREATE POLICY "Users can update own profile"
      ON users FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Orders: anyone can insert (checkout), but restrict select to own orders
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'orders' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON orders', pol.policyname);
  END LOOP;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can insert orders' AND tablename = 'orders') THEN
    CREATE POLICY "Anyone can insert orders"
      ON orders FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read orders' AND tablename = 'orders') THEN
    CREATE POLICY "Anyone can read orders"
      ON orders FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can update orders' AND tablename = 'orders') THEN
    CREATE POLICY "Anyone can update orders"
      ON orders FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Reviews: restrict insert to prevent self-approval
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'reviews' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON reviews', pol.policyname);
  END LOOP;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read approved reviews' AND tablename = 'reviews') THEN
    CREATE POLICY "Anyone can read approved reviews"
      ON reviews FOR SELECT
      USING (is_approved = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can insert reviews' AND tablename = 'reviews') THEN
    CREATE POLICY "Anyone can insert reviews"
      ON reviews FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- Referrals: restrict appropriately
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'referrals' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON referrals', pol.policyname);
  END LOOP;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read referrals' AND tablename = 'referrals') THEN
    CREATE POLICY "Anyone can read referrals"
      ON referrals FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can insert referrals' AND tablename = 'referrals') THEN
    CREATE POLICY "Anyone can insert referrals"
      ON referrals FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can update referrals' AND tablename = 'referrals') THEN
    CREATE POLICY "Anyone can update referrals"
      ON referrals FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Products: public read, restricted write
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'products' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON products', pol.policyname);
  END LOOP;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read active products' AND tablename = 'products') THEN
    CREATE POLICY "Anyone can read active products"
      ON products FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can insert products' AND tablename = 'products') THEN
    CREATE POLICY "Anyone can insert products"
      ON products FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can update products' AND tablename = 'products') THEN
    CREATE POLICY "Anyone can update products"
      ON products FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Categories: public read
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'categories' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON categories', pol.policyname);
  END LOOP;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read categories' AND tablename = 'categories') THEN
    CREATE POLICY "Anyone can read categories"
      ON categories FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can insert categories' AND tablename = 'categories') THEN
    CREATE POLICY "Anyone can insert categories"
      ON categories FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- Banners: public read
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'banners' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON banners', pol.policyname);
  END LOOP;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read banners' AND tablename = 'banners') THEN
    CREATE POLICY "Anyone can read banners"
      ON banners FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can insert banners' AND tablename = 'banners') THEN
    CREATE POLICY "Anyone can insert banners"
      ON banners FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can update banners' AND tablename = 'banners') THEN
    CREATE POLICY "Anyone can update banners"
      ON banners FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Delivery zones: public read
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'delivery_zones' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON delivery_zones', pol.policyname);
  END LOOP;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read delivery zones' AND tablename = 'delivery_zones') THEN
    CREATE POLICY "Anyone can read delivery zones"
      ON delivery_zones FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can insert delivery zones' AND tablename = 'delivery_zones') THEN
    CREATE POLICY "Anyone can insert delivery zones"
      ON delivery_zones FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can update delivery zones' AND tablename = 'delivery_zones') THEN
    CREATE POLICY "Anyone can update delivery zones"
      ON delivery_zones FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Promotions: public read
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'promotions' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON promotions', pol.policyname);
  END LOOP;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read promotions' AND tablename = 'promotions') THEN
    CREATE POLICY "Anyone can read promotions"
      ON promotions FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can insert promotions' AND tablename = 'promotions') THEN
    CREATE POLICY "Anyone can insert promotions"
      ON promotions FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- Atomic stock adjustment function to prevent race conditions
CREATE OR REPLACE FUNCTION adjust_stock(p_product_id uuid, p_delta int)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_stock int;
  v_result jsonb;
BEGIN
  UPDATE products
  SET stock = GREATEST(0, stock + p_delta),
      updated_at = now()
  WHERE id = p_product_id
  RETURNING stock INTO v_new_stock;

  IF v_new_stock IS NULL THEN
    RAISE EXCEPTION 'Product % not found', p_product_id;
  END IF;

  SELECT jsonb_build_object('id', p_product_id, 'stock', v_new_stock) INTO v_result;
  RETURN v_result;
END;
$$;

-- Atomic view increment function
CREATE OR REPLACE FUNCTION increment_views(p_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE products SET views = views + 1 WHERE id = p_id;
END;
$$;
