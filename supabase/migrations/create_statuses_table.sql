/*
      # Create statuses table

      1. New Tables
        - `statuses`
          - `id` (uuid, primary key)
          - `name` (text, unique, not null)
          - `created_at` (timestamp, default now())
      2. Security
        - Enable RLS on `statuses` table
        - Add policy for public to read all statuses
        - Add policy for authenticated users to insert statuses
        - Add policy for authenticated users to update statuses
        - Add policy for authenticated users to delete statuses
    */

    CREATE TABLE IF NOT EXISTS statuses (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text UNIQUE NOT NULL DEFAULT '',
      created_at timestamptz DEFAULT now()
    );

    ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view all statuses.' AND tablename = 'statuses') THEN
        CREATE POLICY "Public can view all statuses."
          ON statuses FOR SELECT
          USING (true);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert statuses.' AND tablename = 'statuses') THEN
        CREATE POLICY "Authenticated users can insert statuses."
          ON statuses FOR INSERT
          WITH CHECK (auth.uid() IS NOT NULL);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update statuses.' AND tablename = 'statuses') THEN
        CREATE POLICY "Authenticated users can update statuses."
          ON statuses FOR UPDATE
          USING (auth.uid() IS NOT NULL);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can delete statuses.' AND tablename = 'statuses') THEN
        CREATE POLICY "Authenticated users can delete statuses."
          ON statuses FOR DELETE
          USING (auth.uid() IS NOT NULL);
      END IF;
    END $$;
