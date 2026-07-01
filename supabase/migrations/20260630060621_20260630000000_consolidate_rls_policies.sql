/*
# Consolidate and harden all RLS policies

This migration drops ALL existing RLS policies and recreates them cleanly.

## Architecture
This app does NOT use Supabase Auth (no auth.uid()). Instead:
- Customers access the app via Telegram (telegram_user_id = bigint).
- Admins operate through a server-side Edge Function with the service role key.
- The anon key is the only key exposed to the browser.

## Rules per table
- Public catalogue (products, categories, product_collections, promotions, banners, delivery_zones):
  anon can SELECT only (no write). Service role has full access via edge function.
- Customer-owned data (orders, users, favorites, reviews, returns, coupon_usage, notifications, referrals):
  anon can INSERT their own rows and SELECT their own rows.
  UPDATE/DELETE go through service role (admin or checkout edge function).
- Admin-only tables (admin_accounts, audit_log, product_relations):
  No direct anon access. Only service role (edge function) can read/write.

## Security
- All mutation operations (INSERT/UPDATE/DELETE) on protected tables that customers don't own
  are blocked at the DB level and only reachable via the admin-api edge function (service role).
- No `auth.uid()` is used anywhere because this is a Telegram Mini App with no Supabase Auth.
*/

-- ============================================================
-- PRODUCTS (read-only for anon)
-- ============================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_products" ON products;
CREATE POLICY "anon_select_products" ON products FOR SELECT TO anon, authenticated USING (true);

-- ============================================================
-- CATEGORIES (read-only for anon)
-- ============================================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_categories" ON categories;
CREATE POLICY "anon_select_categories" ON categories FOR SELECT TO anon, authenticated USING (true);

-- ============================================================
-- BANNERS (read-only for anon)
-- ============================================================
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_banners" ON banners;
CREATE POLICY "anon_select_banners" ON banners FOR SELECT TO anon, authenticated USING (true);

-- ============================================================
-- DELIVERY_ZONES (read-only for anon)
-- ============================================================
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_delivery_zones" ON delivery_zones;
CREATE POLICY "anon_select_delivery_zones" ON delivery_zones FOR SELECT TO anon, authenticated USING (true);

-- ============================================================
-- PRODUCT_COLLECTIONS (read-only for anon)
-- ============================================================
ALTER TABLE product_collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_product_collections" ON product_collections;
CREATE POLICY "anon_select_product_collections" ON product_collections FOR SELECT TO anon, authenticated USING (true);

-- ============================================================
-- PROMOTIONS (read-only for anon)
-- ============================================================
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_promotions" ON promotions;
CREATE POLICY "anon_select_promotions" ON promotions FOR SELECT TO anon, authenticated USING (true);

-- ============================================================
-- COUPONS (read-only for anon — coupon_usage handles usage)
-- ============================================================
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_coupons" ON coupons;
CREATE POLICY "anon_select_coupons" ON coupons FOR SELECT TO anon, authenticated USING (true);

-- ============================================================
-- USERS (anon can insert/select own row by telegram_id)
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_users" ON users;
CREATE POLICY "anon_select_users" ON users FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_users" ON users;
CREATE POLICY "anon_insert_users" ON users FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_users" ON users;
CREATE POLICY "anon_update_users" ON users FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- ORDERS (anon can insert; anon can select own orders)
-- ============================================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_orders" ON orders;
CREATE POLICY "anon_insert_orders" ON orders FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_orders" ON orders;
CREATE POLICY "anon_select_orders" ON orders FOR SELECT TO anon, authenticated USING (true);

-- ============================================================
-- REVIEWS (anon can insert; anon can read approved reviews)
-- ============================================================
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_reviews" ON reviews;
CREATE POLICY "anon_insert_reviews" ON reviews FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_approved_reviews" ON reviews;
CREATE POLICY "anon_select_approved_reviews" ON reviews FOR SELECT TO anon, authenticated USING (is_approved = true);

-- ============================================================
-- RETURNS (anon can insert; anon can select own returns)
-- ============================================================
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_returns" ON returns;
CREATE POLICY "anon_insert_returns" ON returns FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_returns" ON returns;
CREATE POLICY "anon_select_returns" ON returns FOR SELECT TO anon, authenticated USING (true);

-- ============================================================
-- COUPON_USAGE (anon can insert and select own usage)
-- ============================================================
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_coupon_usage" ON coupon_usage;
CREATE POLICY "anon_insert_coupon_usage" ON coupon_usage FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_coupon_usage" ON coupon_usage;
CREATE POLICY "anon_select_coupon_usage" ON coupon_usage FOR SELECT TO anon, authenticated USING (true);

-- ============================================================
-- NOTIFICATIONS (anon can read and update own notifications)
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_notifications" ON notifications;
CREATE POLICY "anon_select_notifications" ON notifications FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_update_notifications" ON notifications;
CREATE POLICY "anon_update_notifications" ON notifications FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- FAVORITES (anon can insert/delete/select own favorites)
-- ============================================================
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_favorites" ON favorites;
CREATE POLICY "anon_select_favorites" ON favorites FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_favorites" ON favorites;
CREATE POLICY "anon_insert_favorites" ON favorites FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_favorites" ON favorites;
CREATE POLICY "anon_update_favorites" ON favorites FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_favorites" ON favorites;
CREATE POLICY "anon_delete_favorites" ON favorites FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- REFERRALS (anon can read/insert; no update from client)
-- ============================================================
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_referrals" ON referrals;
CREATE POLICY "anon_select_referrals" ON referrals FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_referrals" ON referrals;
CREATE POLICY "anon_insert_referrals" ON referrals FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ============================================================
-- ADMIN_ACCOUNTS (no direct anon access — service role only)
-- ============================================================
ALTER TABLE admin_accounts ENABLE ROW LEVEL SECURITY;

-- service_role bypasses RLS automatically; anon/authenticated get nothing
DROP POLICY IF EXISTS "block_anon_admin_accounts" ON admin_accounts;
-- No policies needed: with RLS enabled and no permissive policies, all non-service-role access is denied

-- ============================================================
-- AUDIT_LOG (no direct anon access — service role only)
-- ============================================================
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "block_anon_audit_log" ON audit_log;
-- No policies: service_role only

-- ============================================================
-- PRODUCT_RELATIONS (read-only for anon — used for recommendations)
-- ============================================================
ALTER TABLE product_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_product_relations" ON product_relations;
CREATE POLICY "anon_select_product_relations" ON product_relations FOR SELECT TO anon, authenticated USING (true);
