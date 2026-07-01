/*
  # Add soft-delete columns to key tables

  1. Modified Tables
    - products, users, orders, categories, banners — add deleted_at column

  2. Notes
    - deleted_at IS NULL means record is active
    - SET deleted_at = now() to soft-delete
    - SET deleted_at = NULL to restore
*/

ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;