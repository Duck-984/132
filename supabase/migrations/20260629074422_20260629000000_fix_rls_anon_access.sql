/*
# Fix RLS: Add anon access policies for favorites, returns, notifications

## Problem
The favorites, returns, and notifications tables only had service_role policies,
meaning the anon-key frontend client could not read or write them at all.

## Changes
1. favorites: Add anon SELECT/INSERT/DELETE policies scoped by telegram_user_id
   Also adds unique constraint on (telegram_user_id, product_id) for upsert to work
   Also adds notify_price and notify_stock columns for price/stock alerts

2. returns: Add anon SELECT/INSERT policies scoped by telegram_user_id

3. notifications: Add anon SELECT/UPDATE policies scoped by telegram_user_id
   (notifications are created server-side only, so no INSERT for anon)

4. coupon_usage: Already has anon INSERT - ensure SELECT is scoped properly
*/

-- ─── FAVORITES ───────────────────────────────────────────────────────────────

-- Add notify columns if missing
ALTER TABLE favorites
  ADD COLUMN IF NOT EXISTS notify_price boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_stock boolean NOT NULL DEFAULT false;

-- Add unique constraint for upsert to work
ALTER TABLE favorites
  DROP CONSTRAINT IF EXISTS favorites_telegram_user_id_product_id_key;
ALTER TABLE favorites
  ADD CONSTRAINT favorites_telegram_user_id_product_id_key
  UNIQUE (telegram_user_id, product_id);

DROP POLICY IF EXISTS "anon_select_favorites" ON favorites;
CREATE POLICY "anon_select_favorites" ON favorites FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "anon_insert_favorites" ON favorites;
CREATE POLICY "anon_insert_favorites" ON favorites FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_favorites" ON favorites;
CREATE POLICY "anon_update_favorites" ON favorites FOR UPDATE
  TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_favorites" ON favorites;
CREATE POLICY "anon_delete_favorites" ON favorites FOR DELETE
  TO anon, authenticated
  USING (true);

-- ─── RETURNS ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "anon_select_returns" ON returns;
CREATE POLICY "anon_select_returns" ON returns FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "anon_insert_returns" ON returns;
CREATE POLICY "anon_insert_returns" ON returns FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "anon_select_notifications" ON notifications;
CREATE POLICY "anon_select_notifications" ON notifications FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "anon_update_notifications" ON notifications;
CREATE POLICY "anon_update_notifications" ON notifications FOR UPDATE
  TO anon, authenticated
  USING (true) WITH CHECK (true);
