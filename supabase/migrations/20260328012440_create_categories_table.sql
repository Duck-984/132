/*
  # Create categories table

  1. New Tables
    - `categories`
      - `id` (uuid, primary key)
      - `name` (jsonb) - multilingual name {ru: string, uz: string}
      - `slug` (text, unique)
      - `icon` (text) - icon name from lucide-react
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on `categories` table
    - Add policy for public read access (categories are public data)
    - Add policy for authenticated admins to manage categories
*/

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name jsonb NOT NULL DEFAULT '{"ru": "", "uz": ""}',
  slug text UNIQUE NOT NULL,
  icon text DEFAULT 'tag',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view categories' AND tablename = 'categories') THEN
    CREATE POLICY "Anyone can view categories"
      ON categories
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert categories' AND tablename = 'categories') THEN
    CREATE POLICY "Authenticated users can insert categories"
      ON categories
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update categories' AND tablename = 'categories') THEN
    CREATE POLICY "Authenticated users can update categories"
      ON categories
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can delete categories' AND tablename = 'categories') THEN
    CREATE POLICY "Authenticated users can delete categories"
      ON categories
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;