-- Fix remaining RLS and recreate storage bucket

-- 1. Coupons: allow anon insert/update for admin panel usage
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'coupons_insert_admin' AND tablename = 'coupons') THEN
    CREATE POLICY coupons_insert_admin ON coupons FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'coupons_update_admin' AND tablename = 'coupons') THEN
    CREATE POLICY coupons_update_admin ON coupons FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'coupons_delete_admin' AND tablename = 'coupons') THEN
    CREATE POLICY coupons_delete_admin ON coupons FOR DELETE TO anon USING (true);
  END IF;
END $$;

-- 2. Product collections: allow anon insert/update/delete for admin panel
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'collections_insert_anon' AND tablename = 'product_collections') THEN
    CREATE POLICY collections_insert_anon ON product_collections FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'collections_update_anon' AND tablename = 'product_collections') THEN
    CREATE POLICY collections_update_anon ON product_collections FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'collections_delete_anon' AND tablename = 'product_collections') THEN
    CREATE POLICY collections_delete_anon ON product_collections FOR DELETE TO anon USING (true);
  END IF;
END $$;

-- 3. Reviews: allow anon insert (customers leave reviews)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'reviews_insert_anon' AND tablename = 'reviews') THEN
    CREATE POLICY reviews_insert_anon ON reviews FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

-- 4. Favorites: allow anon update/delete
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'favorites_update_anon' AND tablename = 'favorites') THEN
    CREATE POLICY favorites_update_anon ON favorites FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 5. Banners: allow anon insert/update/delete for admin panel
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'banners_insert_anon' AND tablename = 'banners') THEN
    CREATE POLICY banners_insert_anon ON banners FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'banners_update_anon' AND tablename = 'banners') THEN
    CREATE POLICY banners_update_anon ON banners FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'banners_delete_anon' AND tablename = 'banners') THEN
    CREATE POLICY banners_delete_anon ON banners FOR DELETE TO anon USING (true);
  END IF;
END $$;

-- 6. Delivery zones: allow anon insert/update/delete for admin panel
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'delivery_insert_anon' AND tablename = 'delivery_zones') THEN
    CREATE POLICY delivery_insert_anon ON delivery_zones FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'delivery_update_anon' AND tablename = 'delivery_zones') THEN
    CREATE POLICY delivery_update_anon ON delivery_zones FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'delivery_delete_anon' AND tablename = 'delivery_zones') THEN
    CREATE POLICY delivery_delete_anon ON delivery_zones FOR DELETE TO anon USING (true);
  END IF;
END $$;

-- 7. Promotions: allow full CRUD for admin panel
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'promotions_select_anon' AND tablename = 'promotions') THEN
    CREATE POLICY promotions_select_anon ON promotions FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'promotions_insert_anon' AND tablename = 'promotions') THEN
    CREATE POLICY promotions_insert_anon ON promotions FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'promotions_update_anon' AND tablename = 'promotions') THEN
    CREATE POLICY promotions_update_anon ON promotions FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'promotions_delete_anon' AND tablename = 'promotions') THEN
    CREATE POLICY promotions_delete_anon ON promotions FOR DELETE TO anon USING (true);
  END IF;
END $$;

-- 8. Referrals: allow anon insert/select for referral system
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'referrals_select_anon' AND tablename = 'referrals') THEN
    CREATE POLICY referrals_select_anon ON referrals FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'referrals_insert_anon' AND tablename = 'referrals') THEN
    CREATE POLICY referrals_insert_anon ON referrals FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'referrals_update_anon' AND tablename = 'referrals') THEN
    CREATE POLICY referrals_update_anon ON referrals FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 9. Product relations: allow anon CRUD for admin
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'relations_select_anon' AND tablename = 'product_relations') THEN
    CREATE POLICY relations_select_anon ON product_relations FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'relations_insert_anon' AND tablename = 'product_relations') THEN
    CREATE POLICY relations_insert_anon ON product_relations FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'relations_delete_anon' AND tablename = 'product_relations') THEN
    CREATE POLICY relations_delete_anon ON product_relations FOR DELETE TO anon USING (true);
  END IF;
END $$;

-- 10. Audit log: allow anon insert for logging
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'audit_select_anon' AND tablename = 'audit_log') THEN
    CREATE POLICY audit_select_anon ON audit_log FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'audit_insert_anon' AND tablename = 'audit_log') THEN
    CREATE POLICY audit_insert_anon ON audit_log FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

-- 11. Returns: allow anon update for admin
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'returns_update_anon' AND tablename = 'returns') THEN
    CREATE POLICY returns_update_anon ON returns FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'returns_insert_anon' AND tablename = 'returns') THEN
    CREATE POLICY returns_insert_anon ON returns FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;
