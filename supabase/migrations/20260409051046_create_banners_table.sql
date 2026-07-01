/*
  # Create banners table

  ## Summary
  Adds a banners table for the Home page slider in the Mini App,
  with full admin CRUD support.

  ## New Tables
  - `banners`
    - `id` (uuid, primary key)
    - `title` (jsonb) — multilingual title { ru, uz }
    - `subtitle` (jsonb) — multilingual subtitle { ru, uz }
    - `image_url` (text) — banner image URL
    - `link_url` (text, nullable) — optional CTA link
    - `link_label` (jsonb, nullable) — multilingual button label { ru, uz }
    - `bg_color` (text) — CSS gradient or hex color
    - `is_active` (boolean) — whether to show in slider
    - `sort_order` (integer) — display order
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Public SELECT for active banners
  - No direct write access from client (admin manages via service role / backend)
*/

CREATE TABLE IF NOT EXISTS banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title jsonb NOT NULL DEFAULT '{"ru": "", "uz": ""}',
  subtitle jsonb NOT NULL DEFAULT '{"ru": "", "uz": ""}',
  image_url text NOT NULL DEFAULT '',
  link_url text,
  link_label jsonb DEFAULT '{"ru": "", "uz": ""}',
  bg_color text NOT NULL DEFAULT 'from-blue-500 to-blue-700',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view active banners' AND tablename = 'banners') THEN
    CREATE POLICY "Anyone can view active banners"
      ON banners FOR SELECT
      USING (is_active = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role can insert banners' AND tablename = 'banners') THEN
    CREATE POLICY "Service role can insert banners"
      ON banners FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role can update banners' AND tablename = 'banners') THEN
    CREATE POLICY "Service role can update banners"
      ON banners FOR UPDATE
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role can delete banners' AND tablename = 'banners') THEN
    CREATE POLICY "Service role can delete banners"
      ON banners FOR DELETE
      TO service_role
      USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS banners_sort_order_idx ON banners (sort_order, is_active);

INSERT INTO banners (title, subtitle, image_url, link_url, link_label, bg_color, is_active, sort_order)
VALUES
(
  '{"ru": "Новая коллекция!", "uz": "Yangi kolleksiya!"}',
  '{"ru": "Скидки до 30% на все товары", "uz": "Barcha mahsulotlarda 30% chegirma"}',
  'https://images.pexels.com/photos/3769747/pexels-photo-3769747.jpeg?auto=compress&cs=tinysrgb&w=800',
  '/catalog',
  '{"ru": "Смотреть", "uz": "Ko''rish"}',
  'from-blue-600 to-cyan-500',
  true,
  1
),
(
  '{"ru": "Топ продаж", "uz": "Eng ko''p sotiladigan"}',
  '{"ru": "Лучшие товары по лучшим ценам", "uz": "Eng yaxshi mahsulotlar eng yaxshi narxlarda"}',
  'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=800',
  '/catalog',
  '{"ru": "Купить", "uz": "Sotib olish"}',
  'from-emerald-500 to-teal-600',
  true,
  2
),
(
  '{"ru": "Специальное предложение", "uz": "Maxsus taklif"}',
  '{"ru": "Бесплатная доставка от 500 000 сум", "uz": "500 000 so''mdan bepul yetkazib berish"}',
  'https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg?auto=compress&cs=tinysrgb&w=800',
  '/catalog',
  '{"ru": "Узнать больше", "uz": "Ko''proq bilish"}',
  'from-orange-500 to-red-500',
  true,
  3
);
