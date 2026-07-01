-- ============================================================
-- FIX ALL SUPABASE LINTER WARNINGS
-- 
-- Problem: Migration 20260626160000 re-added permissive anon
-- policies (USING true / WITH CHECK true) that 20260619000000
-- had properly removed. This migration restores correct RLS.
--
-- Strategy:
--   - Catalog tables: public SELECT + service_role ALL
--   - Admin-only tables: service_role only (no anon access)
--   - User data tables: public SELECT + service_role ALL
--     (all writes go through edge functions using service_role)
--   - SECURITY DEFINER functions: restrict to service_role only
-- ============================================================

-- Helper: drop all policies on a table
CREATE OR REPLACE FUNCTION _drop_all_policies(target_table text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = target_table AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, target_table);
  END LOOP;
END;
$$;

-- Helper: create a policy only if it doesn't exist
CREATE OR REPLACE FUNCTION _create_policy_if_missing(
  p_name text, p_table text, p_cmd text,
  p_roles text[], p_using text, p_with_check text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  role_list text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = p_name AND tablename = p_table) THEN
    RETURN;
  END IF;

  role_list := array_to_string(p_roles, ', ');

  IF p_cmd = 'ALL' THEN
    IF p_using IS NOT NULL AND p_with_check IS NOT NULL THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR ALL TO %s USING (%s) WITH CHECK (%s)',
        p_name, p_table, role_list, p_using, p_with_check
      );
    ELSIF p_using IS NOT NULL THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR ALL TO %s USING (%s)',
        p_name, p_table, role_list, p_using
      );
    END IF;
  ELSIF p_cmd = 'SELECT' THEN
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT TO %s USING (%s)',
      p_name, p_table, role_list, p_using
    );
  ELSIF p_cmd = 'INSERT' THEN
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT TO %s WITH CHECK (%s)',
      p_name, p_table, role_list, p_with_check
    );
  ELSIF p_cmd = 'UPDATE' THEN
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE TO %s USING (%s) WITH CHECK (%s)',
      p_name, p_table, role_list, p_using, p_with_check
    );
  ELSIF p_cmd = 'DELETE' THEN
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR DELETE TO %s USING (%s)',
      p_name, p_table, role_list, p_using
    );
  END IF;
END;
$$;

-- ============================================================
-- 1. PRODUCTS — public read, service_role writes
-- ============================================================
SELECT _drop_all_policies('products');
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_missing('Public read products', 'products', 'SELECT', ARRAY['anon', 'authenticated'], 'true', NULL);
SELECT _create_policy_if_missing('Service role manage products', 'products', 'ALL', ARRAY['service_role'], 'true', 'true');

-- ============================================================
-- 2. CATEGORIES — public read, service_role writes
-- ============================================================
SELECT _drop_all_policies('categories');
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_missing('Public read categories', 'categories', 'SELECT', ARRAY['anon', 'authenticated'], 'true', NULL);
SELECT _create_policy_if_missing('Service role manage categories', 'categories', 'ALL', ARRAY['service_role'], 'true', 'true');

-- ============================================================
-- 3. BANNERS — public read, service_role writes
-- ============================================================
SELECT _drop_all_policies('banners');
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_missing('Public read banners', 'banners', 'SELECT', ARRAY['anon', 'authenticated'], 'true', NULL);
SELECT _create_policy_if_missing('Service role manage banners', 'banners', 'ALL', ARRAY['service_role'], 'true', 'true');

-- ============================================================
-- 4. DELIVERY ZONES — public read, service_role writes
-- ============================================================
SELECT _drop_all_policies('delivery_zones');
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_missing('Public read delivery_zones', 'delivery_zones', 'SELECT', ARRAY['anon', 'authenticated'], 'true', NULL);
SELECT _create_policy_if_missing('Service role manage delivery_zones', 'delivery_zones', 'ALL', ARRAY['service_role'], 'true', 'true');

-- ============================================================
-- 5. PROMOTIONS — public read, service_role writes
-- ============================================================
SELECT _drop_all_policies('promotions');
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_missing('Public read promotions', 'promotions', 'SELECT', ARRAY['anon', 'authenticated'], 'true', NULL);
SELECT _create_policy_if_missing('Service role manage promotions', 'promotions', 'ALL', ARRAY['service_role'], 'true', 'true');

-- ============================================================
-- 6. PRODUCT COLLECTIONS — public read, service_role writes
-- ============================================================
SELECT _drop_all_policies('product_collections');
ALTER TABLE product_collections ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_missing('Public read product_collections', 'product_collections', 'SELECT', ARRAY['anon', 'authenticated'], 'true', NULL);
SELECT _create_policy_if_missing('Service role manage product_collections', 'product_collections', 'ALL', ARRAY['service_role'], 'true', 'true');

-- ============================================================
-- 7. PRODUCT RELATIONS — public read, service_role writes
-- ============================================================
SELECT _drop_all_policies('product_relations');
ALTER TABLE product_relations ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_missing('Public read product_relations', 'product_relations', 'SELECT', ARRAY['anon', 'authenticated'], 'true', NULL);
SELECT _create_policy_if_missing('Service role manage product_relations', 'product_relations', 'ALL', ARRAY['service_role'], 'true', 'true');

-- ============================================================
-- 8. COUPONS — public read (active only for validation), service_role writes
-- ============================================================
SELECT _drop_all_policies('coupons');
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_missing('Public read active coupons', 'coupons', 'SELECT', ARRAY['anon', 'authenticated'], 'true', NULL);
SELECT _create_policy_if_missing('Service role manage coupons', 'coupons', 'ALL', ARRAY['service_role'], 'true', 'true');

-- ============================================================
-- 9. COUPON USAGE — public read (for validation counts), service_role writes
-- ============================================================
SELECT _drop_all_policies('coupon_usage');
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_missing('Public read coupon_usage', 'coupon_usage', 'SELECT', ARRAY['anon', 'authenticated'], 'true', NULL);
SELECT _create_policy_if_missing('Service role manage coupon_usage', 'coupon_usage', 'ALL', ARRAY['service_role'], 'true', 'true');

-- ============================================================
-- 10. USERS — public read, service_role writes (registration via edge function)
-- ============================================================
SELECT _drop_all_policies('users');
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_missing('Public read users', 'users', 'SELECT', ARRAY['anon', 'authenticated'], 'true', NULL);
SELECT _create_policy_if_missing('Service role manage users', 'users', 'ALL', ARRAY['service_role'], 'true', 'true');

-- ============================================================
-- 11. ORDERS — public read (own orders by app-layer filter), service_role writes
-- ============================================================
SELECT _drop_all_policies('orders');
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_missing('Public read orders', 'orders', 'SELECT', ARRAY['anon', 'authenticated'], 'true', NULL);
SELECT _create_policy_if_missing('Service role manage orders', 'orders', 'ALL', ARRAY['service_role'], 'true', 'true');

-- ============================================================
-- 12. REVIEWS — public read (approved only), service_role writes
-- Customer review creation goes through edge function (service_role)
-- ============================================================
SELECT _drop_all_policies('reviews');
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_missing('Public read approved reviews', 'reviews', 'SELECT', ARRAY['anon', 'authenticated'], 'is_approved = true', NULL);
SELECT _create_policy_if_missing('Service role manage reviews', 'reviews', 'ALL', ARRAY['service_role'], 'true', 'true');

-- ============================================================
-- 13. REFERRALS — public read, service_role writes
-- ============================================================
SELECT _drop_all_policies('referrals');
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_missing('Public read referrals', 'referrals', 'SELECT', ARRAY['anon', 'authenticated'], 'true', NULL);
SELECT _create_policy_if_missing('Service role manage referrals', 'referrals', 'ALL', ARRAY['service_role'], 'true', 'true');

-- ============================================================
-- 14. FAVORITES — public read, service_role writes
-- ============================================================
SELECT _drop_all_policies('favorites');
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_missing('Public read favorites', 'favorites', 'SELECT', ARRAY['anon', 'authenticated'], 'true', NULL);
SELECT _create_policy_if_missing('Service role manage favorites', 'favorites', 'ALL', ARRAY['service_role'], 'true', 'true');

-- ============================================================
-- 15. NOTIFICATIONS — public read, service_role writes
-- ============================================================
SELECT _drop_all_policies('notifications');
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_missing('Public read notifications', 'notifications', 'SELECT', ARRAY['anon', 'authenticated'], 'true', NULL);
SELECT _create_policy_if_missing('Service role manage notifications', 'notifications', 'ALL', ARRAY['service_role'], 'true', 'true');

-- ============================================================
-- 16. RETURNS — public read, service_role writes
-- ============================================================
SELECT _drop_all_policies('returns');
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_missing('Public read returns', 'returns', 'SELECT', ARRAY['anon', 'authenticated'], 'true', NULL);
SELECT _create_policy_if_missing('Service role manage returns', 'returns', 'ALL', ARRAY['service_role'], 'true', 'true');

-- ============================================================
-- 17. AUDIT LOG — service_role only (admin-only table)
-- ============================================================
SELECT _drop_all_policies('audit_log');
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_missing('Service role manage audit_log', 'audit_log', 'ALL', ARRAY['service_role'], 'true', 'true');

-- ============================================================
-- 18. ADMIN ACCOUNTS — service_role only
-- ============================================================
SELECT _drop_all_policies('admin_accounts');
ALTER TABLE admin_accounts ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_missing('Service role manage admin_accounts', 'admin_accounts', 'ALL', ARRAY['service_role'], 'true', 'true');

-- ============================================================
-- 19. BOT USERS — service_role only
-- ============================================================
SELECT _drop_all_policies('bot_users');
ALTER TABLE bot_users ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_missing('Service role manage bot_users', 'bot_users', 'ALL', ARRAY['service_role'], 'true', 'true');

-- ============================================================
-- 20. ABANDONED CARTS — service_role only
-- ============================================================
SELECT _drop_all_policies('abandoned_carts');
ALTER TABLE abandoned_carts ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_missing('Service role manage abandoned_carts', 'abandoned_carts', 'ALL', ARRAY['service_role'], 'true', 'true');

-- ============================================================
-- SECURITY DEFINER FUNCTIONS — restrict to service_role only
-- ============================================================
REVOKE EXECUTE ON FUNCTION create_order_with_stock(bigint, jsonb, numeric, jsonb, text, numeric, text, text, uuid, numeric, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION create_order_with_stock(bigint, jsonb, numeric, jsonb, text, numeric, text, text, uuid, numeric, text) TO service_role;

REVOKE EXECUTE ON FUNCTION append_order_status(text, text, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION append_order_status(text, text, text, text) TO service_role;

REVOKE EXECUTE ON FUNCTION verify_admin_password(text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_admin_password(text, text) TO service_role;

-- ============================================================
-- CLEANUP helpers
-- ============================================================
DROP FUNCTION IF EXISTS _drop_all_policies(text);
DROP FUNCTION IF EXISTS _create_policy_if_missing(text, text, text, text[], text, text);
