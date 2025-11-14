/*
      # Create roles table and populate with default roles (V3)

      1. New Tables
        - `roles`
          - `id` (uuid, primary key, default gen_random_uuid())
          - `name` (text, unique, not null)
          - `created_at` (timestamptz, default now())
      2. Data Seeding
        - Insert default roles: 'Admin', 'Manager', 'Employee'
      3. Security
        - Enable RLS on `roles` table
        - Add policy for public to read roles
        - Add policy for authenticated users to insert roles
        - Add policy for authenticated users to update roles
    */

    CREATE TABLE IF NOT EXISTS roles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text UNIQUE NOT NULL,
      created_at timestamptz DEFAULT now()
    );

    ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

    -- Policies for roles table
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

    -- Seed default roles if they don't exist
    INSERT INTO roles (name)
    VALUES ('Admin'), ('Manager'), ('Employee')
    ON CONFLICT (name) DO NOTHING;