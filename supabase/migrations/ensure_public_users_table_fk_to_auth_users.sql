/*
  # Ensure public.users table has foreign key to auth.users

  1. Changes to `users` table:
    - Drop existing `users_id_fkey` if it's a self-referencing foreign key.
    - Drop `fk_role` foreign key temporarily to allow `id` column modification.
    - Drop `id` column's `DEFAULT gen_random_uuid()` constraint.
    - Add foreign key constraint from `public.users.id` to `auth.users.id` with `ON DELETE CASCADE`.
    - Re-add `fk_role` foreign key.
  2. Security
    - Re-enable RLS on `users` table.
    - Recreate RLS policies on `users` table to ensure they are compatible with the new FK.
*/

-- Temporarily disable RLS to modify table structure
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Drop existing foreign key constraint if it's a self-referencing one (from previous schema)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_id_fkey' AND contype = 'f' AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users DROP CONSTRAINT users_id_fkey;
  END IF;
END $$;

-- Drop fk_role temporarily to allow id column modification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_role' AND contype = 'f' AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users DROP CONSTRAINT fk_role;
  END IF;
END $$;

-- Remove default value from id column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'public.users'::regclass
      AND attname = 'id'
      AND atthasdef
  ) THEN
    ALTER TABLE public.users ALTER COLUMN id DROP DEFAULT;
  END IF;
END $$;

-- Add foreign key constraint from public.users.id to auth.users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_auth_id_fkey' AND contype = 'f' AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_auth_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Re-add fk_role foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_role' AND contype = 'f' AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT fk_role FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- Re-enable RLS for users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies for users table

-- Policy for authenticated users: Can create their own profile
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can create their own profile' AND tablename = 'users') THEN
    CREATE POLICY "Authenticated users can create their own profile"
      ON public.users
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Policy for authenticated Admin users to SELECT all users
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all users' AND tablename = 'users') THEN
    CREATE POLICY "Admins can view all users"
      ON public.users
      FOR SELECT
      TO authenticated
      USING (EXISTS (SELECT 1 FROM public.users u JOIN public.roles r ON u.role_id = r.id WHERE u.id = auth.uid() AND r.name = 'Admin'));
  END IF;
END $$;

-- Policy for authenticated Admin users to UPDATE any user
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update all users' AND tablename = 'users') THEN
    CREATE POLICY "Admins can update all users"
      ON public.users
      FOR UPDATE
      TO authenticated
      USING (EXISTS (SELECT 1 FROM public.users u JOIN public.roles r ON u.role_id = r.id WHERE u.id = auth.uid() AND r.name = 'Admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.users u JOIN public.roles r ON u.role_id = r.id WHERE u.id = auth.uid() AND r.name = 'Admin'));
  END IF;
END $$;

-- Policy for authenticated Admin users to DELETE any user
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete users' AND tablename = 'users') THEN
    CREATE POLICY "Admins can delete users"
      ON public.users
      FOR DELETE
      TO authenticated
      USING (EXISTS (SELECT 1 FROM public.users u JOIN public.roles r ON u.role_id = r.id WHERE u.id = auth.uid() AND r.name = 'Admin'));
  END IF;
END $$;

-- Policy for authenticated users: Can read their own profile
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read their own profile' AND tablename = 'users') THEN
    CREATE POLICY "Authenticated users can read their own profile"
      ON public.users
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;
END $$;

-- Policy for authenticated users: Can update their own name
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update their own name' AND tablename = 'users') THEN
    CREATE POLICY "Authenticated users can update their own name"
      ON public.users
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;
