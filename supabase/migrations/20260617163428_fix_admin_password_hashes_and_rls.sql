
-- Update password hashes for all admin accounts
UPDATE admin_accounts
SET password_hash = '$2b$10$DCd.gxmBoUczJwLsPbSel.6nbK9a64/6veRINRWkn0V/wMPAEc/7G'
WHERE email = 'admin@shop.uz';

UPDATE admin_accounts
SET password_hash = '$2b$10$PlRasK.VzygA5ONJeEUnle0XndvVu4NIrLGbrdca/ahGKqA6So3AG'
WHERE email = 'manager@shop.uz';

UPDATE admin_accounts
SET password_hash = '$2b$10$9NF8/OkZ0hC/oUZqVNZ7ye67jZEIKZEQ0g2jRrx2NpG9JMM/aH1pq'
WHERE email = 'seller@shop.uz';

-- Add RLS policy so anon can SELECT from admin_accounts (needed for login)
DROP POLICY IF EXISTS "Public can read admin_accounts for login" ON admin_accounts;
CREATE POLICY "Public can read admin_accounts for login" ON admin_accounts
  FOR SELECT TO public USING (true);

-- Add UPDATE policy so anon can update session_token/last_login_at after login
DROP POLICY IF EXISTS "Public can update admin_accounts session" ON admin_accounts;
CREATE POLICY "Public can update admin_accounts session" ON admin_accounts
  FOR UPDATE TO public USING (true) WITH CHECK (true);
