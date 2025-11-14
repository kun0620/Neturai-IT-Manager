/*
      # Remove email column from profiles table

      1. Modified Tables
        - `profiles`
          - Remove `email` column. The email is already stored in `auth.users` and can be joined.
      2. Security
        - No changes to RLS policies.
    */

    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'email'
      ) THEN
        ALTER TABLE profiles DROP COLUMN email;
      END IF;
    END $$;