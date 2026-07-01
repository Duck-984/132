-- Enable pgcrypto for password verification
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to verify admin password (used by admin-login edge function)
CREATE OR REPLACE FUNCTION verify_admin_password(p_email text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin RECORD;
  v_valid boolean;
BEGIN
  SELECT id, email, first_name, role, is_active, password_hash, password_plain
  INTO v_admin
  FROM admin_accounts
  WHERE email = lower(trim(p_email)) AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Account not found');
  END IF;

  -- Check bcrypt hash first
  IF v_admin.password_hash IS NOT NULL THEN
    v_valid := (v_admin.password_hash = crypt(p_password, v_admin.password_hash));
  -- Fallback to plain text (migration period)
  ELSIF v_admin.password_plain IS NOT NULL THEN
    v_valid := (v_admin.password_plain = p_password);
  ELSE
    RETURN jsonb_build_object('valid', false, 'error', 'No password set');
  END IF;

  IF NOT v_valid THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid password');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'id', v_admin.id,
    'email', v_admin.email,
    'first_name', v_admin.first_name,
    'role', v_admin.role
  );
END;
$$;