/*
  # Re-apply RLS Policies for Users and Assets

  This migration ensures that Row Level Security (RLS) is correctly enabled and policies are applied
  for both the `public.users` and `public.assets` tables. This addresses persistent 400 errors
  by ensuring authenticated users have read access to both tables, including when assets join with users.

  1. Security
    - Explicitly enable RLS on `public.users` and `public.assets`.
    - Drop existing RLS policies for both tables to prevent conflicts.
    - Recreate policies to allow authenticated users to read all data from `public.users`.
    - Recreate policies to allow authenticated users to read all data from `public.assets`.
    - Recreate policies to allow authenticated users to create and update data in `public.assets`.
    - Add a policy to allow authenticated users to delete assets.
*/

-- Ensure RLS is enabled on public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for public.users to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated to read all users" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated to read all users (temporary)" ON public.users;

-- Create a policy to allow authenticated users to read all users
CREATE POLICY "Allow authenticated to read all users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- Ensure RLS is enabled on public.assets
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for public.assets to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can read assets" ON public.assets;
DROP POLICY IF EXISTS "Authenticated users can create assets" ON public.assets;
DROP POLICY IF EXISTS "Authenticated users can update assets" ON public.assets;
DROP POLICY IF EXISTS "Authenticated users can delete assets" ON public.assets;


-- Create policies for public.assets
CREATE POLICY "Authenticated users can read assets"
  ON public.assets
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create assets"
  ON public.assets
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update assets"
  ON public.assets
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete assets"
  ON public.assets
  FOR DELETE
  TO authenticated
  USING (true);
