/*
  # Allow Anonymous Users to Read Roles Table

  1. Security
    - Drop the existing "Authenticated users can view all roles" policy on `roles` table.
    - Add a new RLS policy for `roles`: Anonymous users can view all roles.
  2. Important Notes
    - This change allows unauthenticated users (anon) to read the `roles` table.
    - This is necessary for the registration process to fetch the 'Viewer' role ID *before* the user is fully authenticated.
    - Role names are not sensitive data, so allowing anonymous read access is generally safe.
*/

-- Drop the existing policy that only allows authenticated users
DROP POLICY IF EXISTS "Authenticated users can view all roles" ON public.roles;

-- Add a new policy to allow all anonymous users to view roles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anon users can view all roles' AND tablename = 'roles') THEN
    CREATE POLICY "Anon users can view all roles"
      ON public.roles
      FOR SELECT
      TO anon
      USING (true); -- Allow all anonymous users to select
  END IF;
END $$;
