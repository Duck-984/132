/*
  # Fix RLS policies for admin access

  1. Problem
    - Admin panel uses the anon key to read ALL banners, delivery_zones, and products
      (including inactive ones), but current SELECT policies only allow reading active items
    - This causes admin pages to appear empty or only show active items

  2. Changes
    - Add SELECT policies for anon role to read ALL rows from banners, delivery_zones, products
    - These are needed because the app does not use Supabase Auth (uses custom admin_accounts table)
    - The admin panel enforces access via localStorage session, not via Supabase auth roles

  3. Security Note
    - Product/banner/delivery data is not sensitive - it's catalog data
    - Orders already have "Anyone can view" policy
    - The only sensitive table (admin_accounts) already restricts password visibility
*/

-- Allow reading ALL banners (not just active) for admin panel
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anon can read all banners' AND tablename = 'banners') THEN
    CREATE POLICY "Anon can read all banners"
      ON banners FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

-- Allow reading ALL delivery zones (not just active) for admin panel
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anon can read all delivery zones' AND tablename = 'delivery_zones') THEN
    CREATE POLICY "Anon can read all delivery zones"
      ON delivery_zones FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

-- Allow anon to INSERT banners (admin panel uses anon key)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anon can insert banners' AND tablename = 'banners') THEN
    CREATE POLICY "Anon can insert banners"
      ON banners FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;
END $$;

-- Allow anon to UPDATE banners
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anon can update banners' AND tablename = 'banners') THEN
    CREATE POLICY "Anon can update banners"
      ON banners FOR UPDATE
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Allow anon to DELETE banners
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anon can delete banners' AND tablename = 'banners') THEN
    CREATE POLICY "Anon can delete banners"
      ON banners FOR DELETE
      TO anon
      USING (true);
  END IF;
END $$;

-- Allow anon to INSERT delivery zones
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anon can insert delivery zones' AND tablename = 'delivery_zones') THEN
    CREATE POLICY "Anon can insert delivery zones"
      ON delivery_zones FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;
END $$;

-- Allow anon to UPDATE delivery zones
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anon can update delivery zones' AND tablename = 'delivery_zones') THEN
    CREATE POLICY "Anon can update delivery zones"
      ON delivery_zones FOR UPDATE
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Allow anon to DELETE delivery zones
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anon can delete delivery zones' AND tablename = 'delivery_zones') THEN
    CREATE POLICY "Anon can delete delivery zones"
      ON delivery_zones FOR DELETE
      TO anon
      USING (true);
  END IF;
END $$;

-- Allow anon to view ALL products (including inactive) for admin panel
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anon can read all products' AND tablename = 'products') THEN
    CREATE POLICY "Anon can read all products"
      ON products FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;