/*
  # Fix RLS Policy for Roles Table

  1. Security
    - Drop the existing "Admins can view roles" policy on `roles` table.
    - Add a new RLS policy for `roles`: Authenticated users can view all roles.
  2. Important Notes
    - This change allows any authenticated user to read the `roles` table, which is necessary for the registration process to fetch the 'Viewer' role ID.
    - The previous policy was too restrictive, only allowing 'Admin' users to view roles, which prevented new user registration.
*/

-- Drop the existing restrictive policy for roles
DROP POLICY IF EXISTS "Admins can view roles" ON public.roles;

-- Add a new policy to allow all authenticated users to view roles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view all roles' AND tablename = 'roles') THEN
    CREATE POLICY "Authenticated users can view all roles"
      ON public.roles
      FOR SELECT
      TO authenticated
      USING (true); -- Allow all authenticated users to select
  END IF;
END $$;