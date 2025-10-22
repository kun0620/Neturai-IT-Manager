/*
      # Create assets table

      1. New Tables
        - `assets`
          - `id` (uuid, primary key)
          - `name` (text, not null)
          - `type` (text, e.g., 'Laptop', 'Monitor', 'Server')
          - `serial_number` (text, unique)
          - `status` (text, e.g., 'Active', 'In Repair', 'Retired')
          - `assigned_to` (uuid, foreign key to `profiles.id` or `auth.users.id`)
          - `purchase_date` (date)
          - `warranty_end_date` (date)
          - `created_at` (timestamptz, default now())
          - `updated_at` (timestamptz, default now())
      2. Security
        - Enable RLS on `assets` table
        - Add policy for authenticated users to read all assets
        - Add policy for authenticated users to insert assets
        - Add policy for authenticated users to update assets
        - Add policy for authenticated users to delete assets
    */

    CREATE TABLE IF NOT EXISTS assets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL DEFAULT '',
      type text DEFAULT '',
      serial_number text UNIQUE DEFAULT '',
      status text DEFAULT 'Active',
      assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
      purchase_date date,
      warranty_end_date date,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view assets.' AND tablename = 'assets') THEN
        CREATE POLICY "Authenticated users can view assets."
          ON assets FOR SELECT
          TO authenticated
          USING (true);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can create assets.' AND tablename = 'assets') THEN
        CREATE POLICY "Authenticated users can create assets."
          ON assets FOR INSERT
          TO authenticated
          WITH CHECK (true);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update assets.' AND tablename = 'assets') THEN
        CREATE POLICY "Authenticated users can update assets."
          ON assets FOR UPDATE
          TO authenticated
          USING (true)
          WITH CHECK (true);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can delete assets.' AND tablename = 'assets') THEN
        CREATE POLICY "Authenticated users can delete assets."
          ON assets FOR DELETE
          TO authenticated
          USING (true);
      END IF;
    END $$;
