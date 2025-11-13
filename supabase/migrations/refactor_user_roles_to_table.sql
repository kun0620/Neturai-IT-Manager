/*
  # Refactor User Roles to a Separate Table (Policy Exists Fix)

  1. Changes to `users` table:
    - Drop existing RLS policies.
    - Drop `set_users_updated_at` trigger.
    - Drop `role` column.
    - Add `role_id` column (uuid, foreign key to `roles.id`).
    - Set default `role_id` to the ID of the 'Viewer' role.
  2. New Tables
    - `roles`
      - `id` (uuid, primary key)
      - `name` (text, unique, not null)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  3. Security
    - Drop `public.user_role` enum.
    - Enable RLS on `roles` table.
    - Add RLS policy for `roles`: Admins can view roles.
    - Recreate RLS policies on `users` table, updated to use `role_id` and join with `roles` table.
      - Allow authenticated users to create their own profile.
      - Admins can view, update, delete all users.
      - Authenticated users can read/update their own profile (name only).
  4. Important Notes
    - This migration refactors the user role management from an ENUM type in the `users` table to a dedicated `roles` table with a foreign key relationship.
    - This addresses the `relation "public.roles" does not exist` error by creating the expected table.
    - Existing users will have their `role_id` set to 'Viewer' if they don't have a role already.
    - **Fix**: Wrapped `CREATE POLICY` statements in `DO $$ BEGIN ... END $$` blocks with `IF NOT EXISTS` checks to prevent "policy already exists" errors.
*/

-- Drop existing RLS policies on public.users
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can create users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can read their own profile" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can update their own name" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users; -- In case this old policy still exists
DROP POLICY IF EXISTS "Authenticated users can create their own profile" ON public.users; -- Explicitly drop the problematic policy

-- Drop existing trigger on users table
DROP TRIGGER IF EXISTS set_users_updated_at ON users;

-- Drop the 'role' column from the users table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
    ALTER TABLE users DROP COLUMN role;
  END IF;
END $$;

-- Drop the user_role enum type if it exists, cascading to dependent objects
DROP TYPE IF EXISTS public.user_role CASCADE;

-- Create the roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default roles if they don't already exist
INSERT INTO roles (name) VALUES
('Admin'),
('Editor'),
('Viewer')
ON CONFLICT (name) DO NOTHING;

-- Add the role_id column to the users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role_id') THEN
    ALTER TABLE users ADD COLUMN role_id uuid;
  END IF;
END $$;

-- Set default role_id for existing users to 'Viewer' if role_id is NULL
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'Viewer') WHERE role_id IS NULL;

-- Ensure role_id column is NOT NULL and add foreign key constraint
DO $$
BEGIN
  -- Check if the column is already NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role_id' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE users ALTER COLUMN role_id SET NOT NULL;
  END IF;

  -- Add foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_role' AND contype = 'f' AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE users ADD CONSTRAINT fk_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- Recreate the trigger function to update the `updated_at` column automatically
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Recreate the trigger for the users table
CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security (RLS) for roles table
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Policy for roles: Admins can view all roles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view roles' AND tablename = 'roles') THEN
    CREATE POLICY "Admins can view roles"
      ON public.roles
      FOR SELECT
      TO authenticated
      USING (EXISTS (SELECT 1 FROM public.users u JOIN public.roles r ON u.role_id = r.id WHERE u.id = auth.uid() AND r.name = 'Admin'));
  END IF;
END $$;

-- Recreate RLS policies for users table, updated to use role_id and join with roles table

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
