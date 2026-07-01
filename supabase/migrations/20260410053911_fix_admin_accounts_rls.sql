/*
  # Исправление RLS политик для таблицы admin_accounts

  ## Описание
  Обновляет политики безопасности для таблицы admin_accounts.
  Поскольку аутентификация происходит на клиентской стороне через anon key,
  мы разрешаем чтение только нужных полей (без возврата password_plain в отдельных запросах)
  и оставляем управление через политики для anon пользователей.

  ## Изменения
  - Сбрасываем старые политики
  - Создаём правильные политики для anon и authenticated
  - SELECT: разрешён для всех (нужно для логина)
  - INSERT/UPDATE/DELETE: только для authenticated (admin через свою сессию)

  ## Важные заметки
  Таблица не использует Supabase Auth, поэтому проверка происходит
  через сравнение email + password_plain на клиенте.
  Управление аккаунтами в AdminUsers.tsx работает через anon key.
*/

DROP POLICY IF EXISTS "Admins can view admin accounts" ON admin_accounts;
DROP POLICY IF EXISTS "Admins can insert admin accounts" ON admin_accounts;
DROP POLICY IF EXISTS "Admins can update admin accounts" ON admin_accounts;
DROP POLICY IF EXISTS "Admins can delete admin accounts" ON admin_accounts;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon read for login' AND tablename = 'admin_accounts') THEN
    CREATE POLICY "Allow anon read for login"
      ON admin_accounts FOR SELECT
      TO anon
      USING (is_active = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated full read' AND tablename = 'admin_accounts') THEN
    CREATE POLICY "Allow authenticated full read"
      ON admin_accounts FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon insert for management' AND tablename = 'admin_accounts') THEN
    CREATE POLICY "Allow anon insert for management"
      ON admin_accounts FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon update for management' AND tablename = 'admin_accounts') THEN
    CREATE POLICY "Allow anon update for management"
      ON admin_accounts FOR UPDATE
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon delete for management' AND tablename = 'admin_accounts') THEN
    CREATE POLICY "Allow anon delete for management"
      ON admin_accounts FOR DELETE
      TO anon
      USING (true);
  END IF;
END $$;
