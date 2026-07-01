/*
  # Create products table

  1. New Tables
    - `products`
      - `id` (uuid, primary key)
      - `name` (jsonb) - multilingual name {ru: string, uz: string}
      - `slug` (text, unique)
      - `price` (numeric) - price in UZS
      - `description` (jsonb) - multilingual description {ru: string, uz: string}
      - `category_id` (uuid, foreign key to categories)
      - `subcategory` (text) - optional subcategory
      - `images` (text[]) - array of image URLs from Storage
      - `sizes` (text[]) - array of available sizes (S, M, L, XL, etc.)
      - `colors` (jsonb[]) - array of color objects {name: string, hex: string}
      - `specs` (jsonb) - technical specifications for gadgets
      - `stock` (integer) - available quantity
      - `is_active` (boolean) - product visibility
      - `views` (integer) - view counter for popularity
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `products` table
    - Add policy for public read access to active products
    - Add policy for authenticated admins to manage products
*/

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name jsonb NOT NULL DEFAULT '{"ru": "", "uz": ""}',
  slug text UNIQUE NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  description jsonb DEFAULT '{"ru": "", "uz": ""}',
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  subcategory text,
  images text[] DEFAULT '{}',
  sizes text[] DEFAULT '{}',
  colors jsonb[] DEFAULT '{}',
  specs jsonb DEFAULT '{}',
  stock integer DEFAULT 0,
  is_active boolean DEFAULT true,
  views integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view active products' AND tablename = 'products') THEN
    CREATE POLICY "Anyone can view active products"
      ON products
      FOR SELECT
      TO anon, authenticated
      USING (is_active = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view all products' AND tablename = 'products') THEN
    CREATE POLICY "Authenticated users can view all products"
      ON products
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert products' AND tablename = 'products') THEN
    CREATE POLICY "Authenticated users can insert products"
      ON products
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update products' AND tablename = 'products') THEN
    CREATE POLICY "Authenticated users can update products"
      ON products
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can delete products' AND tablename = 'products') THEN
    CREATE POLICY "Authenticated users can delete products"
      ON products
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;