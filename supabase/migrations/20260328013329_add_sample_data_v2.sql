/*
  # Add sample data

  1. Categories
    - Add 3 main categories: Clothing, Accessories, Tech
  
  2. Products
    - Add sample products for each category with images from Pexels
    - Include sizes, colors, and specifications
*/

INSERT INTO categories (name, slug, icon) VALUES
  ('{"ru": "Одежда", "uz": "Kiyim"}', 'clothing', 'shirt'),
  ('{"ru": "Аксессуары", "uz": "Aksessuarlar"}', 'accessories', 'watch'),
  ('{"ru": "Техника", "uz": "Texnika"}', 'tech', 'smartphone')
ON CONFLICT (slug) DO NOTHING;

DO $$
DECLARE
  category_clothing_id uuid;
  category_accessories_id uuid;
  category_tech_id uuid;
BEGIN
  SELECT id INTO category_clothing_id FROM categories WHERE slug = 'clothing';
  SELECT id INTO category_accessories_id FROM categories WHERE slug = 'accessories';
  SELECT id INTO category_tech_id FROM categories WHERE slug = 'tech';

  INSERT INTO products (name, slug, price, description, category_id, images, sizes, colors, stock, is_active) VALUES
    (
      '{"ru": "Классическая футболка", "uz": "Klassik futbolka"}',
      'classic-tshirt',
      150000,
      '{"ru": "Удобная хлопковая футболка для повседневной носки", "uz": "Kundalik kiyish uchun qulay paxta futbolka"}',
      category_clothing_id,
      ARRAY['https://images.pexels.com/photos/8532616/pexels-photo-8532616.jpeg'],
      ARRAY['S', 'M', 'L', 'XL'],
      ARRAY['{"name": "Черный", "hex": "#000000"}', '{"name": "Белый", "hex": "#FFFFFF"}', '{"name": "Синий", "hex": "#0000FF"}']::jsonb[],
      50,
      true
    ),
    (
      '{"ru": "Джинсы Slim Fit", "uz": "Slim Fit jinsi"}',
      'slim-fit-jeans',
      350000,
      '{"ru": "Стильные джинсы с зауженным кроем", "uz": "Zamonaviy tor kesimli jinsi shim"}',
      category_clothing_id,
      ARRAY['https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg'],
      ARRAY['28', '30', '32', '34', '36'],
      ARRAY['{"name": "Синий", "hex": "#1E3A8A"}', '{"name": "Черный", "hex": "#000000"}']::jsonb[],
      30,
      true
    ),
    (
      '{"ru": "Спортивная толстовка", "uz": "Sport svitshoti"}',
      'sports-hoodie',
      280000,
      '{"ru": "Теплая толстовка с капюшоном для спорта и отдыха", "uz": "Sport va dam olish uchun issiq kaputli svitshot"}',
      category_clothing_id,
      ARRAY['https://images.pexels.com/photos/8148577/pexels-photo-8148577.jpeg'],
      ARRAY['S', 'M', 'L', 'XL', 'XXL'],
      ARRAY['{"name": "Серый", "hex": "#808080"}', '{"name": "Черный", "hex": "#000000"}']::jsonb[],
      40,
      true
    ),
    (
      '{"ru": "Кожаная сумка", "uz": "Teri sumka"}',
      'leather-bag',
      450000,
      '{"ru": "Элегантная кожаная сумка ручной работы", "uz": "Qolda ishlangan nafis teri sumka"}',
      category_accessories_id,
      ARRAY['https://images.pexels.com/photos/2081199/pexels-photo-2081199.jpeg'],
      ARRAY[]::text[],
      ARRAY['{"name": "Коричневый", "hex": "#8B4513"}', '{"name": "Черный", "hex": "#000000"}']::jsonb[],
      25,
      true
    ),
    (
      '{"ru": "Солнцезащитные очки", "uz": "Quyosh kozoynagi"}',
      'sunglasses',
      120000,
      '{"ru": "Стильные солнцезащитные очки с UV защитой", "uz": "UV himoyali zamonaviy quyosh kozoynagi"}',
      category_accessories_id,
      ARRAY['https://images.pexels.com/photos/701877/pexels-photo-701877.jpeg'],
      ARRAY[]::text[],
      ARRAY['{"name": "Черный", "hex": "#000000"}', '{"name": "Коричневый", "hex": "#8B4513"}']::jsonb[],
      60,
      true
    ),
    (
      '{"ru": "Наручные часы", "uz": "Qol soati"}',
      'wrist-watch',
      550000,
      '{"ru": "Классические наручные часы с кожаным ремешком", "uz": "Teri kamarli klassik qol soati"}',
      category_accessories_id,
      ARRAY['https://images.pexels.com/photos/277390/pexels-photo-277390.jpeg'],
      ARRAY[]::text[],
      ARRAY['{"name": "Серебристый", "hex": "#C0C0C0"}', '{"name": "Золотой", "hex": "#FFD700"}']::jsonb[],
      15,
      true
    ),
    (
      '{"ru": "Смартфон XPro Max", "uz": "Smartfon XPro Max"}',
      'smartphone-xpro-max',
      4500000,
      '{"ru": "Флагманский смартфон с 6.7 AMOLED дисплеем", "uz": "6.7 AMOLED ekranli flagman smartfon"}',
      category_tech_id,
      ARRAY['https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg'],
      ARRAY[]::text[],
      ARRAY['{"name": "Черный", "hex": "#000000"}', '{"name": "Белый", "hex": "#FFFFFF"}', '{"name": "Синий", "hex": "#0000FF"}']::jsonb[],
      20,
      true
    ),
    (
      '{"ru": "Беспроводные наушники", "uz": "Simsiz quloqchin"}',
      'wireless-earbuds',
      350000,
      '{"ru": "TWS наушники с активным шумоподавлением", "uz": "Aktiv shovqin susaytirishli TWS quloqchin"}',
      category_tech_id,
      ARRAY['https://images.pexels.com/photos/3825517/pexels-photo-3825517.jpeg'],
      ARRAY[]::text[],
      ARRAY['{"name": "Белый", "hex": "#FFFFFF"}', '{"name": "Черный", "hex": "#000000"}']::jsonb[],
      45,
      true
    ),
    (
      '{"ru": "Умные часы", "uz": "Aqlli soat"}',
      'smartwatch',
      650000,
      '{"ru": "Смарт-часы с мониторингом здоровья и фитнес-трекером", "uz": "Salomatlik monitoringi va fitnes-trekeri bilan aqlli soat"}',
      category_tech_id,
      ARRAY['https://images.pexels.com/photos/393047/pexels-photo-393047.jpeg'],
      ARRAY[]::text[],
      ARRAY['{"name": "Черный", "hex": "#000000"}', '{"name": "Серебристый", "hex": "#C0C0C0"}']::jsonb[],
      30,
      true
    ),
    (
      '{"ru": "Портативное зарядное устройство", "uz": "Portativ zaryadlash qurilmasi"}',
      'power-bank',
      180000,
      '{"ru": "Power Bank 20000 mAh с быстрой зарядкой", "uz": "Tez zaryadlash bilan 20000 mAh Power Bank"}',
      category_tech_id,
      ARRAY['https://images.pexels.com/photos/4246091/pexels-photo-4246091.jpeg'],
      ARRAY[]::text[],
      ARRAY['{"name": "Черный", "hex": "#000000"}', '{"name": "Белый", "hex": "#FFFFFF"}']::jsonb[],
      70,
      true
    )
  ON CONFLICT (slug) DO NOTHING;
END $$;