/*
  # Ensure roles table, profiles.role column, and foreign key constraint

  This migration ensures the following:
  1. The `roles` table exists and is populated with default roles.
  2. The `profiles` table has the `role` column.
  3. The foreign key constraint `profiles_role_fkey` exists, linking `profiles.role` to `roles.name`.

  1. New Tables
    - `roles` (if not exists)
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `created_at` (timestamptz)
  2. Modified Tables
    - `profiles`
      - Add `role` column (if not exists)
      - Add foreign key constraint `profiles_role_fkey` (if not exists)
  3. Security
    - Ensure RLS is enabled on `roles` table
    - Ensure RLS policies for `roles` table exist
*/

-- 1. Ensure 'roles' table exists and is populated
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public roles are viewable by everyone.' AND tablename = 'roles') THEN
    CREATE POLICY "Public roles are viewable by everyone."
      ON roles FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert roles.' AND tablename = 'roles') THEN
    CREATE POLICY "Authenticated users can insert roles."
      ON roles FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update roles.' AND tablename = 'roles') THEN
    CREATE POLICY "Authenticated users can update roles."
      ON roles FOR UPDATE
      TO authenticated
      USING (true);
  END IF;
END $$;

INSERT INTO roles (name)
VALUES ('Admin'), ('Manager'), ('Employee')
ON CONFLICT (name) DO NOTHING;

-- 2. Ensure 'profiles' table has the 'role' column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role text DEFAULT 'Employee' NOT NULL;
  END IF;
END $$;

-- 3. Ensure foreign key constraint 'profiles_role_fkey' exists
DO $$
BEGIN
  -- Check if the 'roles' table exists before adding the foreign key
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'roles'
  ) THEN
    -- Check if the foreign key constraint already exists
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'profiles_role_fkey'
      AND conrelid = 'public.profiles'::regclass
    ) THEN
      -- Add the foreign key constraint
      ALTER TABLE profiles
      ADD CONSTRAINT profiles_role_fkey
      FOREIGN KEY (role) REFERENCES roles(name) ON UPDATE CASCADE ON DELETE RESTRICT;
    END IF;
  ELSE
    RAISE WARNING 'Table "roles" does not exist. Skipping foreign key creation for profiles.role.';
  END IF;
END $$;
