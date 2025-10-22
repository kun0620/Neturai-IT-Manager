/*
      # Create profiles table

      1. New Tables
        - `profiles`
          - `id` (uuid, primary key, references auth.users.id)
          - `full_name` (text, nullable)
          - `avatar_url` (text, nullable)
          - `created_at` (timestamp, default now())
      2. Security
        - Enable RLS on `profiles` table
        - Add policy for authenticated users to read their own profile
        - Add policy for authenticated users to update their own profile
    */

    CREATE TABLE IF NOT EXISTS profiles (
      id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      full_name text,
      avatar_url text,
      created_at timestamptz DEFAULT now()
    );

    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public profiles are viewable by everyone.' AND tablename = 'profiles') THEN
        CREATE POLICY "Public profiles are viewable by everyone."
          ON profiles FOR SELECT
          USING (true);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own profile.' AND tablename = 'profiles') THEN
        CREATE POLICY "Users can insert their own profile."
          ON profiles FOR INSERT
          WITH CHECK (auth.uid() = id);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own profile.' AND tablename = 'profiles') THEN
        CREATE POLICY "Users can update their own profile."
          ON profiles FOR UPDATE
          USING (auth.uid() = id);
      END IF;
    END $$;