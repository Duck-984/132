/*
  # Create product_collections table

  Curated product sections for catalog (Popular, Sale, For Girls, etc.)
  Admin selects products for each collection.
*/

CREATE TABLE IF NOT EXISTS product_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name jsonb NOT NULL DEFAULT '{"ru": "", "uz": ""}',
  slug text UNIQUE NOT NULL,
  icon text DEFAULT 'tag',
  product_ids text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE product_collections ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view active collections' AND tablename = 'product_collections') THEN
    CREATE POLICY "Anyone can view active collections"
      ON product_collections FOR SELECT
      TO anon, authenticated
      USING (is_active = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated manage collections' AND tablename = 'product_collections') THEN
    CREATE POLICY "Authenticated manage collections"
      ON product_collections FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
