/*
  # Add performance indexes for high-load queries

  1. Changes
    - Add index on orders.telegram_user_id — fast order lookup by user
    - Add index on orders.status — fast filtering by status in admin panel
    - Add index on orders.created_at — fast sorting by date
    - Add index on products.category_id — fast catalog filtering
    - Add index on products.is_active — fast filtering active products
    - Add index on reviews.product_id — fast reviews lookup per product
    - Add index on promotions.is_active — fast active promos query
    - Add composite index on orders (telegram_user_id, created_at) — user order history

  2. Notes
    - All indexes use IF NOT EXISTS to be idempotent
    - Partial indexes used where filtering on boolean columns
    - These indexes target the most common query patterns in the app
*/

-- Orders: user lookup (most common query in Profile/Orders pages)
CREATE INDEX IF NOT EXISTS idx_orders_telegram_user_id ON orders (telegram_user_id);

-- Orders: status filtering (admin orders page)
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);

-- Orders: date sorting
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);

-- Orders: composite for user order history (sorted)
CREATE INDEX IF NOT EXISTS idx_orders_user_history ON orders (telegram_user_id, created_at DESC);

-- Products: category filtering (catalog page)
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products (category_id);

-- Products: active products only (partial index)
CREATE INDEX IF NOT EXISTS idx_products_active ON products (is_active) WHERE is_active = true;

-- Reviews: product reviews lookup
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews (product_id);

-- Promotions: active promotions
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions (is_active) WHERE is_active = true;

-- Banners: active banners
CREATE INDEX IF NOT EXISTS idx_banners_active ON banners (is_active) WHERE is_active = true;

-- Users: telegram_id lookup (already unique, but explicit index for clarity)
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users (telegram_id);