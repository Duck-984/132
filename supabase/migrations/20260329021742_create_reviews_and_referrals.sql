/*
  # Create Reviews and Referrals Tables

  ## New Tables
  1. reviews - Product reviews and ratings
  2. referrals - Referral system for discounts

  ## Security
  - Appropriate RLS policies for each table
*/

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    telegram_user_id bigint NOT NULL,
    user_name text NOT NULL,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment text,
    images text[] DEFAULT '{}',
    is_verified_purchase boolean DEFAULT false,
    is_approved boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reviews_product_id_idx ON reviews(product_id);
CREATE INDEX IF NOT EXISTS reviews_telegram_user_id_idx ON reviews(telegram_user_id);

-- Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_telegram_id bigint NOT NULL,
    referred_telegram_id bigint,
    referral_code text UNIQUE NOT NULL,
    discount_percentage integer DEFAULT 10,
    bonus_amount integer DEFAULT 50000,
    is_redeemed boolean DEFAULT false,
    redeemed_at timestamptz,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON referrals(referrer_telegram_id);
CREATE INDEX IF NOT EXISTS referrals_code_idx ON referrals(referral_code);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Reviews policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Read approved reviews' AND tablename = 'reviews') THEN
    CREATE POLICY "Read approved reviews" ON reviews FOR SELECT TO public USING (is_approved = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Create reviews' AND tablename = 'reviews') THEN
    CREATE POLICY "Create reviews" ON reviews FOR INSERT TO public WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Update reviews' AND tablename = 'reviews') THEN
    CREATE POLICY "Update reviews" ON reviews FOR UPDATE TO public USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage reviews' AND tablename = 'reviews') THEN
    CREATE POLICY "Admins manage reviews" ON reviews FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Referrals policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Read referrals' AND tablename = 'referrals') THEN
    CREATE POLICY "Read referrals" ON referrals FOR SELECT TO public USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Create referrals' AND tablename = 'referrals') THEN
    CREATE POLICY "Create referrals" ON referrals FOR INSERT TO public WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Update referrals' AND tablename = 'referrals') THEN
    CREATE POLICY "Update referrals" ON referrals FOR UPDATE TO public USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage referrals' AND tablename = 'referrals') THEN
    CREATE POLICY "Admins manage referrals" ON referrals FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;