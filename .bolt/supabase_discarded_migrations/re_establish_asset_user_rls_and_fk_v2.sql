/*
  # Re-establish Asset and User RLS and Foreign Key (v2)

  This migration ensures that Row Level Security (RLS) policies and the foreign key
  constraint between the `assets` table and the `users` table are correctly
  established. It addresses previous issues with relationship caching and 400 Bad Request errors.

  1. Security
    - Drop existing RLS policies on `public.users` and `public.assets` to ensure a clean slate.
    - Enable RLS on `public.users`.
    - Create a `SELECT` policy for `public.users` to allow authenticated users to read `id`, `name`, and `email` of all users. This is crucial for the "Assigned To" dropdown in asset management.
    - Enable RLS on `public.assets`.
    - Create `SELECT` policy for `public.assets` to allow authenticated users to read all assets.
    - Create `INSERT` policy for `public.assets` to allow authenticated users to create new assets.
    - Create `UPDATE` policy for `public.assets` to allow authenticated users to update assets.
    - Create `DELETE` policy for `public.assets` to allow authenticated users to delete assets.

  2. Foreign Key
    - Ensure the foreign key `assets_assigned_to_fkey` exists, linking `assets.assigned_to` to `users.id`.
    - If the foreign key does not exist, it will be added.
*/

-- Drop existing RLS policies on public.users
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users to read all user data" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users to update their own profile" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own profile" ON public.users;

-- Enable RLS on public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy for public.users: Allow authenticated users to read id, name, email of all users (for assignment dropdowns)
CREATE POLICY "Allow authenticated users to read all user data for assignment"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy for public.users: Allow authenticated users to insert their own profile
CREATE POLICY "Allow authenticated users to insert their own profile"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy for public.users: Allow authenticated users to update their own profile
CREATE POLICY "Allow authenticated users to update their own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy for public.users: Allow authenticated users to delete their own profile
CREATE POLICY "Allow authenticated users to delete their own profile"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Drop existing RLS policies on public.assets
DROP POLICY IF EXISTS "Allow authenticated users to manage assets" ON public.assets;
DROP POLICY IF EXISTS "Allow authenticated users to read assets" ON public.assets;
DROP POLICY IF EXISTS "Allow authenticated users to insert assets" ON public.assets;
DROP POLICY IF EXISTS "Allow authenticated users to update assets" ON public.assets;
DROP POLICY IF EXISTS "Allow authenticated users to delete assets" ON public.assets;

-- Enable RLS on public.assets
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Policy for public.assets: Allow authenticated users to read all assets
CREATE POLICY "Allow authenticated users to read all assets"
  ON public.assets
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy for public.assets: Allow authenticated users to insert assets
CREATE POLICY "Allow authenticated users to insert assets"
  ON public.assets
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy for public.assets: Allow authenticated users to update assets
CREATE POLICY "Allow authenticated users to update assets"
  ON public.assets
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy for public.assets: Allow authenticated users to delete assets
CREATE POLICY "Allow authenticated users to delete assets"
  ON public.assets
  FOR DELETE
  TO authenticated
  USING (true);

-- Ensure foreign key constraint exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assets_assigned_to_fkey') THEN
    ALTER TABLE public.assets
    ADD CONSTRAINT assets_assigned_to_fkey
    FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;
