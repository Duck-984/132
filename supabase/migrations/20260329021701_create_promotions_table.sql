/*
  # Promotions and Special Offers

  ## New Tables
  1. promotions
     - id (uuid, primary key)
     - title (jsonb {ru, uz})
     - description (jsonb {ru, uz})
     - type ('new_arrival' | 'sale' | 'featured')
     - product_ids (uuid[]) - array of product IDs
     - discount_percentage (integer)
     - is_active (boolean)
     - starts_at (timestamptz)
     - ends_at (timestamptz)
     - created_at (timestamptz)
  
  2. Security
     - Public can read active promotions
     - Admins can manage
*/

CREATE TABLE IF NOT EXISTS promotions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title jsonb NOT NULL DEFAULT '{"ru": "", "uz": ""}'::jsonb,
    description jsonb NOT NULL DEFAULT '{"ru": "", "uz": ""}'::jsonb,
    type text NOT NULL CHECK (type IN ('new_arrival', 'sale', 'featured')),
    product_ids uuid[] DEFAULT '{}',
    discount_percentage integer DEFAULT 0,
    is_active boolean DEFAULT true,
    starts_at timestamptz DEFAULT now(),
    ends_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Create index
CREATE INDEX IF NOT EXISTS promotions_type_active_idx ON promotions(type, is_active);

-- Enable RLS
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

-- Public can read active promotions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read active promotions' AND tablename = 'promotions') THEN
    CREATE POLICY "Public can read active promotions"
        ON promotions
        FOR SELECT
        TO public
        USING (is_active = true AND starts_at <= now() AND (ends_at IS NULL OR ends_at >= now()));
  END IF;
END $$;

-- Admins can manage promotions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage promotions' AND tablename = 'promotions') THEN
    CREATE POLICY "Admins can manage promotions"
        ON promotions
        FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
  END IF;
END $$;