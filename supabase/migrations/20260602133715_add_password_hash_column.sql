/*
  # Add password_hash column to admin_accounts

  1. Modified Tables
    - `admin_accounts`
      - Added `password_hash` (text, nullable) - bcrypt hash of the password
  
  2. Notes
    - Keeps `password_plain` for backwards compatibility during transition
    - password_hash should be populated with bcrypt hashes by the application
    - Once all accounts have password_hash, password_plain can be removed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_accounts' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE admin_accounts ADD COLUMN password_hash text;
  END IF;
END $$;
