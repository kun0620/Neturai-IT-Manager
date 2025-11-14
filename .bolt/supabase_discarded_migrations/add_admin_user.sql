/*
  # Add initial admin user

  1. New Users
    - Create a new user in `auth.users` with email `kun_2541@hotmail.co.th` and password `password123`.
    - Set `email_confirmed_at` to `now()` as email confirmation is disabled.
  2. Modified Tables
    - `profiles`
      - Insert a new profile linked to the new admin user.
      - Set `full_name` to 'Admin User', `email` to 'kun_2541@hotmail.co.th', `role` to 'Admin', `status` to 'Active', and `phone` to 'N/A'.
  3. Security
    - No changes to RLS policies.
*/

DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Create the user in auth.users
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (
    (SELECT id FROM auth.instances LIMIT 1),
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'kun_2541@hotmail.co.th',
    crypt('password123', gen_salt('bf')), -- Default password 'password123'
    now(),
    now(),
    now()
  )
  RETURNING id INTO admin_user_id;

  -- Insert/Update the profile in public.profiles
  INSERT INTO public.profiles (id, full_name, email, role, status, phone, created_at)
  VALUES (
    admin_user_id,
    'Admin User',
    'kun_2541@hotmail.co.th',
    'Admin',
    'Active',
    'N/A',
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    phone = EXCLUDED.phone,
    updated_at = now();

  RAISE NOTICE 'Admin user kun_2541@hotmail.co.th created with ID: %', admin_user_id;
END $$;