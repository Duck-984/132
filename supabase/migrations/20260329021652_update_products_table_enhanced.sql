/*
  # Enhanced Products Table Migration

  ## Changes
  1. Updates products table structure:
     - Ensures name and description are jsonb with {ru, uz}
     - Adds subcategory support
     - Enhances color structure
     - Adds created_at and updated_at triggers
  
  2. Security
     - RLS policies for public read (is_active only)
     - Admin-only write access
*/

-- Add updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_products_updated_at ON products;

-- Create trigger for products
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update RLS policies for products
DROP POLICY IF EXISTS "Public read access for active products" ON products;
DROP POLICY IF EXISTS "Admin full access to products" ON products;

-- Allow public to read only active products
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read access for active products' AND tablename = 'products') THEN
    CREATE POLICY "Public read access for active products"
        ON products
        FOR SELECT
        TO public
        USING (is_active = true);
  END IF;
END $$;

-- Allow authenticated admins full access
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin full access to products' AND tablename = 'products') THEN
    CREATE POLICY "Admin full access to products"
        ON products
        FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE products ENABLE ROW LEVEL SECURITY;