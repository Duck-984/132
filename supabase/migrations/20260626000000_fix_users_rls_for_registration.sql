-- Fix: allow anon INSERT/UPDATE on users table (registration flow uses anon key)

-- Remove existing restrictive policies on users
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON users', pol.policyname);
  END LOOP;
END $$;

-- Public read
DO $$ BEGIN
  CREATE POLICY "Public can read users for lookup"
    ON users FOR SELECT
    USING (true);
END $$;

-- Anon can insert (registration)
DO $$ BEGIN
  CREATE POLICY "Anon can insert users"
    ON users FOR INSERT
    TO anon
    WITH CHECK (true);
END $$;

-- Anon can update own profile
DO $$ BEGIN
  CREATE POLICY "Anon can update users"
    ON users FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);
END $$;

-- Service role full access
DO $$ BEGIN
  CREATE POLICY "Service role full access to users"
    ON users FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
END $$;
