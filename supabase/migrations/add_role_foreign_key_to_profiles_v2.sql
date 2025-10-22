/*
      # Add foreign key constraint to profiles.role (V2)

      1. Modified Tables
        - `profiles`
          - Add foreign key constraint from `role` column to `roles.name`
      2. Security
        - No changes to RLS policies.
    */

    DO $$
    BEGIN
      -- Check if the 'roles' table exists
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