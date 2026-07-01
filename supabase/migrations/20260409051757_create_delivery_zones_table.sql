/*
  # Create delivery_zones table

  ## Summary
  Adds a delivery_zones table for managing shipping rates across regions of Uzbekistan.
  Each zone represents a city/region with standard and express delivery pricing.

  ## New Tables
  - `delivery_zones`
    - `id` (uuid, primary key)
    - `city_ru` (text) — city name in Russian
    - `city_uz` (text) — city name in Uzbek
    - `region_ru` (text) — region/oblast in Russian
    - `region_uz` (text) — region/oblast in Uzbek
    - `standard_price` (integer) — standard delivery price in UZS
    - `express_price` (integer) — express delivery price in UZS
    - `standard_days_min` (integer) — minimum days for standard delivery
    - `standard_days_max` (integer) — maximum days for standard delivery
    - `express_days_min` (integer) — minimum days for express delivery
    - `express_days_max` (integer) — maximum days for express delivery
    - `free_threshold` (integer, nullable) — minimum order amount for free delivery (null = no free delivery)
    - `is_active` (boolean) — whether this zone is available for selection
    - `sort_order` (integer) — display order
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Public SELECT for active zones (needed in Checkout)
  - Service role write access

  ## Seed Data
  - 15 major cities of Uzbekistan with realistic pricing
*/

CREATE TABLE IF NOT EXISTS delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_ru text NOT NULL,
  city_uz text NOT NULL,
  region_ru text NOT NULL DEFAULT '',
  region_uz text NOT NULL DEFAULT '',
  standard_price integer NOT NULL DEFAULT 20000,
  express_price integer NOT NULL DEFAULT 50000,
  standard_days_min integer NOT NULL DEFAULT 3,
  standard_days_max integer NOT NULL DEFAULT 5,
  express_days_min integer NOT NULL DEFAULT 1,
  express_days_max integer NOT NULL DEFAULT 2,
  free_threshold integer DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view active delivery zones' AND tablename = 'delivery_zones') THEN
    CREATE POLICY "Anyone can view active delivery zones"
      ON delivery_zones FOR SELECT
      USING (is_active = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role can insert delivery zones' AND tablename = 'delivery_zones') THEN
    CREATE POLICY "Service role can insert delivery zones"
      ON delivery_zones FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role can update delivery zones' AND tablename = 'delivery_zones') THEN
    CREATE POLICY "Service role can update delivery zones"
      ON delivery_zones FOR UPDATE
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role can delete delivery zones' AND tablename = 'delivery_zones') THEN
    CREATE POLICY "Service role can delete delivery zones"
      ON delivery_zones FOR DELETE
      TO service_role
      USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS delivery_zones_sort_idx ON delivery_zones (sort_order, is_active);

INSERT INTO delivery_zones (city_ru, city_uz, region_ru, region_uz, standard_price, express_price, standard_days_min, standard_days_max, express_days_min, express_days_max, free_threshold, is_active, sort_order)
VALUES
  ('Ташкент', 'Toshkent', 'г. Ташкент', 'Toshkent shahri', 15000, 30000, 1, 2, 0, 1, 500000, true, 1),
  ('Самарканд', 'Samarqand', 'Самаркандская область', 'Samarqand viloyati', 20000, 45000, 2, 4, 1, 2, 750000, true, 2),
  ('Бухара', 'Buxoro', 'Бухарская область', 'Buxoro viloyati', 22000, 50000, 2, 4, 1, 2, 750000, true, 3),
  ('Андижан', 'Andijon', 'Андижанская область', 'Andijon viloyati', 25000, 55000, 3, 5, 1, 2, 800000, true, 4),
  ('Наманган', 'Namangan', 'Наманганская область', 'Namangan viloyati', 25000, 55000, 3, 5, 1, 2, 800000, true, 5),
  ('Фергана', 'Farg''ona', 'Ферганская область', 'Farg''ona viloyati', 25000, 55000, 3, 5, 1, 2, 800000, true, 6),
  ('Коканд', 'Qo''qon', 'Ферганская область', 'Farg''ona viloyati', 27000, 60000, 3, 5, 2, 3, 0, true, 7),
  ('Нукус', 'Nukus', 'Республика Каракалпакстан', 'Qoraqalpog''iston Respublikasi', 35000, 75000, 4, 7, 2, 3, 0, true, 8),
  ('Термез', 'Termiz', 'Сурхандарьинская область', 'Surxondaryo viloyati', 30000, 65000, 3, 6, 2, 3, 0, true, 9),
  ('Карши', 'Qarshi', 'Кашкадарьинская область', 'Qashqadaryo viloyati', 28000, 60000, 3, 5, 2, 3, 0, true, 10),
  ('Хива', 'Xiva', 'Хорезмская область', 'Xorazm viloyati', 32000, 70000, 4, 6, 2, 3, 0, true, 11),
  ('Гулистан', 'Guliston', 'Сырдарьинская область', 'Sirdaryo viloyati', 20000, 45000, 2, 4, 1, 2, 0, true, 12),
  ('Джизак', 'Jizzax', 'Джизакская область', 'Jizzax viloyati', 20000, 45000, 2, 4, 1, 2, 0, true, 13),
  ('Навои', 'Navoiy', 'Навоийская область', 'Navoiy viloyati', 25000, 55000, 3, 5, 2, 3, 0, true, 14),
  ('Ургенч', 'Urganch', 'Хорезмская область', 'Xorazm viloyati', 32000, 70000, 4, 6, 2, 3, 0, true, 15);
