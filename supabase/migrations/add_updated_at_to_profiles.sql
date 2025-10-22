/*
      # Add updated_at column to profiles table

      1. Modified Tables
        - `profiles`
          - Add `updated_at` (timestamptz, default now())
      2. Security
        - No changes to RLS policies.
    */

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'updated_at'
      ) THEN
        ALTER TABLE profiles ADD COLUMN updated_at timestamptz DEFAULT now();
      END IF;
    END $$;