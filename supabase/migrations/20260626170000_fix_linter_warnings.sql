-- Fix Supabase Linter warnings

-- 1. Fix function search_path for all functions (prevents search_path injection)
ALTER FUNCTION update_updated_at_column() SET search_path = public;
ALTER FUNCTION increment_views(uuid) SET search_path = public;
ALTER FUNCTION adjust_stock(uuid, int) SET search_path = public;
ALTER FUNCTION append_order_status(text, text, text, text) SET search_path = public;
ALTER FUNCTION verify_admin_password(text, text) SET search_path = public;
ALTER FUNCTION create_order_with_stock(bigint, jsonb, numeric, jsonb, text, numeric, text, text, uuid, numeric, text) SET search_path = public;

-- 2. SECURITY DEFINER functions: restrict EXECUTE to service_role only
-- These functions should only be called via edge functions (which use service_role), not directly via REST API

-- create_order_with_stock: only edge function should call this
REVOKE EXECUTE ON FUNCTION create_order_with_stock(bigint, jsonb, numeric, jsonb, text, numeric, text, text, uuid, numeric, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION create_order_with_stock(bigint, jsonb, numeric, jsonb, text, numeric, text, text, uuid, numeric, text) TO service_role;

-- append_order_status: only edge function should call this
REVOKE EXECUTE ON FUNCTION append_order_status(text, text, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION append_order_status(text, text, text, text) TO service_role;

-- verify_admin_password: only admin-login edge function should call this
REVOKE EXECUTE ON FUNCTION verify_admin_password(text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_admin_password(text, text) TO service_role;

-- 3. increment_views and adjust_stock: keep public (used by client)
-- These are safe SECURITY INVOKER functions
