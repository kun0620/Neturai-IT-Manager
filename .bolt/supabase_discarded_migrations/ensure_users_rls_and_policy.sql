/*
  # Ensure Users RLS and Policy are Active

  1. Security
    - Explicitly enable RLS on the `public.users` table.
    - Drop any existing temporary policy to prevent conflicts.
    - Recreate the policy to allow all authenticated users to read all data from the `users` table.
    - This is to ensure the RLS policy is correctly applied and active, addressing persistent 400 errors.
*/

-- Ensure RLS is enabled on public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing temporary policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated to read all users (temporary)" ON public.users;

-- Create the policy to allow authenticated users to read all users
CREATE POLICY "Allow authenticated to read all users (temporary)"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);
