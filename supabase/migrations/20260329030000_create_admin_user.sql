/*
  # Create admin user
  
  1. Create admin user in auth.users
    - Email: admin@shop.uz
    - Password: Admin123
*/

-- Create the admin user using Supabase auth API
-- This will be run once to create the initial admin account

DO $$
BEGIN
  -- Create user using auth.signup() - this requires confirmation
  -- For development/testing, you can disable email confirmation
  
  -- First, let's create a secure password hash
  -- Note: You'll need to set the password in Supabase Dashboard 
  -- or use the Supabase CLI to create the user
  
  RAISE NOTICE 'Admin user creation script. Please create user admin@shop.uz with password Admin123 in Supabase Dashboard.';
END $$;
