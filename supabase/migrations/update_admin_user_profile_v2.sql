/*
  # Update admin user profile (re-attempt after adding updated_at)

  1. Modified Tables
    - `profiles`
      - Retrieve the `id` of the existing user `kun_2541@hotmail.co.th` from `auth.users`.
      - Insert or update the profile in `public.profiles` linked to this user ID.
      - Set `full_name` to 'Admin User', `email` to 'kun_2541@hotmail.co.th', `role` to 'Admin', `status` to 'Active', and `phone` to 'N/A'.
  2. Security
    - No changes to RLS policies.
  3. Important Notes
    - This migration assumes the user `kun_2541@hotmail.co.th` already exists in `auth.users`.
    - It will only create/update the corresponding profile entry in `public.profiles`.
*/

DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Retrieve the ID of the existing user from auth.users
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'kun_2541@hotmail.co.th';

  -- Check if the user was found
  IF admin_user_id IS NOT NULL THEN
    -- Insert/Update the profile in public.profiles
    INSERT INTO public.profiles (id, full_name, email, role, status, phone, created_at, updated_at)
    VALUES (
      admin_user_id,
      'Admin User',
      'kun_2541@hotmail.co.th',
      'Admin',
      'Active',
      'N/A',
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      role = EXCLUDED.role,
      status = EXCLUDED.status,
      phone = EXCLUDED.phone,
      updated_at = now();

    RAISE NOTICE 'Profile for admin user kun_2541@hotmail.co.th updated with ID: %', admin_user_id;
  ELSE
    RAISE WARNING 'User kun_2541@hotmail.co.th not found in auth.users. Profile not created/updated.';
  END IF;
END $$;