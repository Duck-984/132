-- Update admin accounts with fresh bcrypt hashes
UPDATE admin_accounts
SET password_hash = extensions.crypt('Admin123', extensions.gen_salt('bf'))
WHERE email = 'admin@shop.uz';

UPDATE admin_accounts
SET password_hash = extensions.crypt('Manager123', extensions.gen_salt('bf'))
WHERE email = 'manager@shop.uz';

UPDATE admin_accounts
SET password_hash = extensions.crypt('Seller123', extensions.gen_salt('bf'))
WHERE email = 'seller@shop.uz';

-- Update plain text for fallback
UPDATE admin_accounts SET password_plain = 'Admin123' WHERE email = 'admin@shop.uz';
UPDATE admin_accounts SET password_plain = 'Manager123' WHERE email = 'manager@shop.uz';
UPDATE admin_accounts SET password_plain = 'Seller123' WHERE email = 'seller@shop.uz';