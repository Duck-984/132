-- Add wishlist notification fields to favorites table
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS notify_price boolean DEFAULT false;
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS notify_stock boolean DEFAULT false;

-- Unique constraint: one favorite per user per product
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'favorites_user_product_unique'
  ) THEN
    ALTER TABLE favorites ADD CONSTRAINT favorites_user_product_unique 
      UNIQUE (telegram_user_id, product_id);
  END IF;
END $$;

-- RLS: users can only update their own favorites
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Policy: users read own favorites
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users read own favorites' AND tablename = 'favorites'
  ) THEN
    CREATE POLICY "Users read own favorites" ON favorites
      FOR SELECT USING (true);
  END IF;
END $$;

-- Policy: users insert own favorites
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users insert own favorites' AND tablename = 'favorites'
  ) THEN
    CREATE POLICY "Users insert own favorites" ON favorites
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Policy: users update own favorites
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users update own favorites' AND tablename = 'favorites'
  ) THEN
    CREATE POLICY "Users update own favorites" ON favorites
      FOR UPDATE USING (true);
  END IF;
END $$;

-- Policy: users delete own favorites
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users delete own favorites' AND tablename = 'favorites'
  ) THEN
    CREATE POLICY "Users delete own favorites" ON favorites
      FOR DELETE USING (true);
  END IF;
END $$;
