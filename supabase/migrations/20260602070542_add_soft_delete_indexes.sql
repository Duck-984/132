/*
  # Add partial indexes for soft-delete queries

  Indexes for efficient querying of non-deleted records.
*/

CREATE INDEX IF NOT EXISTS idx_products_not_deleted ON products (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_not_deleted ON users (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_not_deleted ON orders (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_categories_not_deleted ON categories (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_banners_not_deleted ON banners (id) WHERE deleted_at IS NULL;