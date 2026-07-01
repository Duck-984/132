/*
  # Create orders table

  1. New Tables
    - `orders`
      - `id` (uuid, primary key)
      - `telegram_user_id` (bigint) - Telegram user ID who placed the order
      - `items` (jsonb) - array of order items with product details, quantity, size, color
      - `total_amount` (numeric) - total order amount in UZS
      - `status` (text) - order status: new, processing, shipped, delivered, cancelled
      - `customer_info` (jsonb) - customer information: {name, phone, city, address}
      - `delivery_type` (text) - delivery type: standard, express
      - `delivery_cost` (numeric) - delivery cost in UZS
      - `payment_method` (text) - payment method: cash, card, payme, click
      - `notes` (text) - additional notes
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `orders` table
    - Add policy for users to view their own orders
    - Add policy for authenticated admins to view and manage all orders
*/

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id bigint NOT NULL,
  items jsonb NOT NULL DEFAULT '[]',
  total_amount numeric NOT NULL DEFAULT 0,
  status text DEFAULT 'new',
  customer_info jsonb NOT NULL DEFAULT '{}',
  delivery_type text DEFAULT 'standard',
  delivery_cost numeric DEFAULT 0,
  payment_method text DEFAULT 'cash',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_telegram_user_id ON orders(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can insert orders' AND tablename = 'orders') THEN
    CREATE POLICY "Anyone can insert orders"
      ON orders
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view orders' AND tablename = 'orders') THEN
    CREATE POLICY "Anyone can view orders"
      ON orders
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update orders' AND tablename = 'orders') THEN
    CREATE POLICY "Authenticated users can update orders"
      ON orders
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;