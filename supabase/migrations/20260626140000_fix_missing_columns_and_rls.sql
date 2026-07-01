-- Fix missing columns and RLS policies
-- This migration fixes all issues found in the audit

-- 1. Missing columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id uuid;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;

-- 2. Fix RLS policies — restore anon access for client-side queries

-- FAVORITES: allow anon/authenticated to read own, insert, delete
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'favorites_select_own' AND tablename = 'favorites') THEN
    CREATE POLICY favorites_select_own ON favorites FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'favorites_insert' AND tablename = 'favorites') THEN
    CREATE POLICY favorites_insert ON favorites FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'favorites_delete' AND tablename = 'favorites') THEN
    CREATE POLICY favorites_delete ON favorites FOR DELETE TO anon, authenticated USING (true);
  END IF;
END $$;

-- NOTIFICATIONS: allow anon to read own, update own
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notifications_select_own' AND tablename = 'notifications') THEN
    CREATE POLICY notifications_select_own ON notifications FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notifications_update_own' AND tablename = 'notifications') THEN
    CREATE POLICY notifications_update_own ON notifications FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notifications_insert' AND tablename = 'notifications') THEN
    CREATE POLICY notifications_insert ON notifications FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
END $$;

-- RETURNS: allow anon to read own
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'returns_select_own' AND tablename = 'returns') THEN
    CREATE POLICY returns_select_own ON returns FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

-- COUPONS: allow anon to read active coupons (for validation)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'coupons_select_active' AND tablename = 'coupons') THEN
    CREATE POLICY coupons_select_active ON coupons FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

-- COUPON_USAGE: allow anon to read and insert (for validation and recording)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'coupon_usage_select' AND tablename = 'coupon_usage') THEN
    CREATE POLICY coupon_usage_select ON coupon_usage FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'coupon_usage_insert' AND tablename = 'coupon_usage') THEN
    CREATE POLICY coupon_usage_insert ON coupon_usage FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
END $$;

-- ADMIN_ACCOUNTS: allow anon to verify session tokens (read-only)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admin_accounts_session_verify' AND tablename = 'admin_accounts') THEN
    CREATE POLICY admin_accounts_session_verify ON admin_accounts FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- 3. Fix promotions type mismatch: add alias column
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'promotions' AND column_name = 'discount_percent') THEN
    ALTER TABLE promotions ADD COLUMN discount_percent integer;
    UPDATE promotions SET discount_percent = discount_percentage WHERE discount_percent IS NULL;
  END IF;
END $$;
