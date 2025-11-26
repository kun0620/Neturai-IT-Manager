/*
  # Add user details to profiles table

  1. Modified Tables
    - `profiles`
      - Add `email` (text, unique, nullable)
      - Add `role` (text, default 'Employee')
      - Add `status` (text, default 'Active')
      - Add `phone` (text, nullable)
  2. Security
    - No changes to RLS policies, existing policies will apply.
*/

DO $$
BEGIN
  -- Add email column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
    ALTER TABLE profiles ADD COLUMN email text UNIQUE;
  END IF;

  -- Add role column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE profiles ADD COLUMN role text DEFAULT 'Employee';
  END IF;

  -- Add status column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'status') THEN
    ALTER TABLE profiles ADD COLUMN status text DEFAULT 'Active';
  END IF;

  -- Add phone column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
    ALTER TABLE profiles ADD COLUMN phone text;
  END IF;
END $$;
