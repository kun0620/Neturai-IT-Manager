/*
      # Create categories table

      1. New Tables
        - `categories`
          - `id` (uuid, primary key)
          - `name` (text, unique, not null)
          - `created_at` (timestamp, default now())
      2. Security
        - Enable RLS on `categories` table
        - Add policy for public to read all categories
        - Add policy for authenticated users to insert categories
        - Add policy for authenticated users to update categories
        - Add policy for authenticated users to delete categories
    */

    CREATE TABLE IF NOT EXISTS categories (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text UNIQUE NOT NULL DEFAULT '',
      created_at timestamptz DEFAULT now()
    );

    ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view all categories.' AND tablename = 'categories') THEN
        CREATE POLICY "Public can view all categories."
          ON categories FOR SELECT
          USING (true);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert categories.' AND tablename = 'categories') THEN
        CREATE POLICY "Authenticated users can insert categories."
          ON categories FOR INSERT
          WITH CHECK (auth.uid() IS NOT NULL);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update categories.' AND tablename = 'categories') THEN
        CREATE POLICY "Authenticated users can update categories."
          ON categories FOR UPDATE
          USING (auth.uid() IS NOT NULL);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can delete categories.' AND tablename = 'categories') THEN
        CREATE POLICY "Authenticated users can delete categories."
          ON categories FOR DELETE
          USING (auth.uid() IS NOT NULL);
      END IF;
    END $$;