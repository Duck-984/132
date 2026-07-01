-- Add missing indexes for performance at scale
-- price range queries, notification polling, review filtering

-- Products: price range filtering
CREATE INDEX IF NOT EXISTS idx_products_price ON products (price);

-- Products: stock filtering for availability checks
CREATE INDEX IF NOT EXISTS idx_products_stock ON products (stock) WHERE stock > 0;

-- Reviews: partial index for approved reviews (most common query)
CREATE INDEX IF NOT EXISTS idx_reviews_approved ON reviews (product_id, created_at DESC) WHERE is_approved = true;

-- Notifications: fast count for badge
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (telegram_user_id, is_read) WHERE is_read = false;

-- Coupon usage: composite index for validation queries
CREATE INDEX IF NOT EXISTS idx_coupon_usage_lookup ON coupon_usage (coupon_id, telegram_user_id);

-- Orders: user history with pagination
CREATE INDEX IF NOT EXISTS idx_orders_user_date ON orders (telegram_user_id, created_at DESC);
