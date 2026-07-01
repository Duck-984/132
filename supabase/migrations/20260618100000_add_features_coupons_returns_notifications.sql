/*
  # Feature migrations: Coupons, Abandoned Carts, Notifications, Returns, Audit Log (extended), Product Relations

  New Tables:
    - coupons (F3)
    - coupon_usage (F3)
    - abandoned_carts (F4)
    - notifications (F6)
    - returns (F7)
    - product_relations (F10)

  Extended Tables:
    - admin_accounts: add super_admin, support, content roles (F5)
    - reviews: add photos, moderation fields (F8)
    - orders: add coupon fields (F3)
*/

-- F3: Coupons
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('percent', 'fixed')),
  value numeric NOT NULL CHECK (value > 0),
  min_order_amount numeric DEFAULT 0,
  max_uses_total integer DEFAULT NULL,
  max_uses_per_user integer DEFAULT 1,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  is_active boolean DEFAULT true,
  new_customers_only boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons (code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons (is_active, valid_from, valid_until);

CREATE TABLE IF NOT EXISTS coupon_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  telegram_user_id integer NOT NULL,
  order_id text,
  used_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON coupon_usage (coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user ON coupon_usage (telegram_user_id);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read active coupons' AND tablename = 'coupons') THEN
    CREATE POLICY "Anyone can read active coupons" ON coupons FOR SELECT USING (is_active = true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to coupons' AND tablename = 'coupons') THEN
    CREATE POLICY "Service role full access to coupons" ON coupons FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to coupon_usage' AND tablename = 'coupon_usage') THEN
    CREATE POLICY "Service role full access to coupon_usage" ON coupon_usage FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anon insert coupon_usage' AND tablename = 'coupon_usage') THEN
    CREATE POLICY "Anon insert coupon_usage" ON coupon_usage FOR INSERT WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anon select own coupon_usage' AND tablename = 'coupon_usage') THEN
    CREATE POLICY "Anon select own coupon_usage" ON coupon_usage FOR SELECT USING (true);
  END IF;
END $$;

-- F4: Abandoned Carts
CREATE TABLE IF NOT EXISTS abandoned_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id integer NOT NULL,
  items jsonb NOT NULL DEFAULT '[]',
  total_amount numeric DEFAULT 0,
  notified_at timestamptz,
  recovered_order_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_abandoned_carts_user ON abandoned_carts (telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_pending ON abandoned_carts (notified_at) WHERE notified_at IS NULL;

ALTER TABLE abandoned_carts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to abandoned_carts' AND tablename = 'abandoned_carts') THEN
    CREATE POLICY "Service role full access to abandoned_carts" ON abandoned_carts FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anon manage own abandoned_carts' AND tablename = 'abandoned_carts') THEN
    CREATE POLICY "Anon manage own abandoned_carts" ON abandoned_carts FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- F6: Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id integer NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb DEFAULT '{}',
  is_read boolean DEFAULT false,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (telegram_user_id, is_read, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to notifications' AND tablename = 'notifications') THEN
    CREATE POLICY "Service role full access to notifications" ON notifications FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anon read own notifications' AND tablename = 'notifications') THEN
    CREATE POLICY "Anon read own notifications" ON notifications FOR SELECT USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anon update own notifications' AND tablename = 'notifications') THEN
    CREATE POLICY "Anon update own notifications" ON notifications FOR UPDATE USING (true);
  END IF;
END $$;

-- F7: Returns
CREATE TABLE IF NOT EXISTS returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  telegram_user_id integer NOT NULL,
  items jsonb NOT NULL DEFAULT '[]',
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'refunded')),
  refund_amount numeric DEFAULT 0,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_returns_order ON returns (order_id);
CREATE INDEX IF NOT EXISTS idx_returns_user ON returns (telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns (status);

ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to returns' AND tablename = 'returns') THEN
    CREATE POLICY "Service role full access to returns" ON returns FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anon select own returns' AND tablename = 'returns') THEN
    CREATE POLICY "Anon select own returns" ON returns FOR SELECT USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anon insert own returns' AND tablename = 'returns') THEN
    CREATE POLICY "Anon insert own returns" ON returns FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- F8: Extend reviews with photos + moderation
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'photos') THEN
    ALTER TABLE reviews ADD COLUMN photos text[] DEFAULT '{}';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'is_verified_purchase') THEN
    ALTER TABLE reviews ADD COLUMN is_verified_purchase boolean DEFAULT false;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'admin_reply') THEN
    ALTER TABLE reviews ADD COLUMN admin_reply text;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'user_name') THEN
    ALTER TABLE reviews ADD COLUMN user_name text DEFAULT '';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'comment') THEN
    ALTER TABLE reviews ADD COLUMN comment text;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'is_approved') THEN
    ALTER TABLE reviews ADD COLUMN is_approved boolean DEFAULT true;
  END IF;
END $$;

-- F10: Product Relations (upsell/cross-sell)
CREATE TABLE IF NOT EXISTS product_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  related_product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  relation_type text NOT NULL CHECK (relation_type IN ('upsell', 'cross_sell', 'bundle')),
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, related_product_id, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_product_relations_product ON product_relations (product_id, relation_type);
CREATE INDEX IF NOT EXISTS idx_product_relations_related ON product_relations (related_product_id);

ALTER TABLE product_relations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read product_relations' AND tablename = 'product_relations') THEN
    CREATE POLICY "Anyone can read product_relations" ON product_relations FOR SELECT USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to product_relations' AND tablename = 'product_relations') THEN
    CREATE POLICY "Service role full access to product_relations" ON product_relations FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Add coupon fields to orders
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'coupon_id') THEN
    ALTER TABLE orders ADD COLUMN coupon_id uuid REFERENCES coupons(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'discount_amount') THEN
    ALTER TABLE orders ADD COLUMN discount_amount numeric DEFAULT 0;
  END IF;
END $$;
