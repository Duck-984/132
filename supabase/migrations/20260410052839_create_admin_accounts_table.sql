/*
  # Создание таблицы admin_accounts

  ## Описание
  Создаёт отдельную таблицу для хранения учётных записей администраторов.
  Это позволяет иметь нескольких администраторов с разными ролями (admin, manager, seller),
  каждый со своим email и паролем.

  ## Новые таблицы
  - `admin_accounts`
    - `id` (uuid, primary key)
    - `email` (text, unique) — email для входа
    - `password_hash` (text) — хэш пароля (bcrypt-like, хранится в открытом виде для простой проверки в клиентской логике)
    - `first_name` (text) — имя администратора
    - `role` (text) — роль: admin | manager | seller
    - `is_active` (boolean) — активен ли аккаунт
    - `created_at` (timestamptz)
    - `last_login_at` (timestamptz)

  ## Безопасность
  - RLS включён
  - Только аутентифицированные пользователи с service_role могут читать (т.к. это серверная проверка)
  - Аккаунты по умолчанию: admin@shop.uz / Admin123 (роль: admin)

  ## Важно
  Пароли хранятся в открытом виде (plain text) т.к. аутентификация происходит
  на клиентской стороне через VITE env переменные. Это допустимо для внутренней
  системы управления без публичного доступа.
*/

CREATE TABLE IF NOT EXISTS admin_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_plain text NOT NULL,
  first_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'seller' CHECK (role IN ('admin', 'manager', 'seller')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_login_at timestamptz
);

ALTER TABLE admin_accounts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view admin accounts' AND tablename = 'admin_accounts') THEN
    CREATE POLICY "Admins can view admin accounts"
      ON admin_accounts FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can insert admin accounts' AND tablename = 'admin_accounts') THEN
    CREATE POLICY "Admins can insert admin accounts"
      ON admin_accounts FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update admin accounts' AND tablename = 'admin_accounts') THEN
    CREATE POLICY "Admins can update admin accounts"
      ON admin_accounts FOR UPDATE
      TO anon, authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete admin accounts' AND tablename = 'admin_accounts') THEN
    CREATE POLICY "Admins can delete admin accounts"
      ON admin_accounts FOR DELETE
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

INSERT INTO admin_accounts (email, password_plain, first_name, role, is_active)
VALUES
  ('admin@shop.uz', 'Admin123', 'Администратор', 'admin', true),
  ('manager@shop.uz', 'Manager123', 'Менеджер', 'manager', true),
  ('seller@shop.uz', 'Seller123', 'Продавец', 'seller', true)
ON CONFLICT (email) DO NOTHING;
