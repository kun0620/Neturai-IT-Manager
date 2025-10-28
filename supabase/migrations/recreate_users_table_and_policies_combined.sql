/*
      # Recreate users table and all RLS policies (Combined and Fixed - Enum Fix)

      1. New Tables
        - `users`
          - `id` (uuid, primary key, references auth.users)
          - `name` (text, user's full name)
          - `email` (text, unique, user's email)
          - `role` (enum: 'Admin', 'Editor', 'Viewer', default 'Viewer')
          - `created_at` (timestamp, default now())
          - `updated_at` (timestamp, default now(), auto-updated)
      2. Security
        - Enable RLS on `users` table
        - Add granular RLS policies:
          - Admins can view all users.
          - Admins can create users.
          - Admins can update all users.
          - Admins can delete users.
          - Authenticated users can read their own profile.
          - Authenticated users can update their own name.
      3. Changes
        - Add `update_updated_at_column` trigger to `users` table.
      4. Important Notes
        - This migration combines table creation, enum creation, trigger setup, and all RLS policies into a single file to ensure correct execution order.
        - Removed `IF NOT EXISTS` from `CREATE POLICY` statements.
        - Added `DROP TYPE IF EXISTS public.user_role CASCADE;` to ensure a clean recreation of the enum type.
    */

    -- Drop the user_role enum type if it exists, cascading to dependent objects
    DROP TYPE IF EXISTS public.user_role CASCADE;

    -- Create the user_role enum type if it doesn't exist
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('Admin', 'Editor', 'Viewer');
      END IF;
    END
    $$;

    -- Create the users table if it doesn't exist
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      name text NOT NULL DEFAULT '',
      email text UNIQUE NOT NULL,
      role public.user_role DEFAULT 'Viewer'::public.user_role NOT NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    -- Add the role column if it doesn't exist and set its type
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
        ALTER TABLE users ADD COLUMN role public.user_role DEFAULT 'Viewer'::public.user_role NOT NULL;
      ELSE
        -- Ensure the role column has the correct type if it already exists
        ALTER TABLE users ALTER COLUMN role TYPE public.user_role USING role::text::public.user_role;
        ALTER TABLE users ALTER COLUMN role SET DEFAULT 'Viewer'::public.user_role;
        ALTER TABLE users ALTER COLUMN role SET NOT NULL;
      END IF;
    END
    $$;

    -- Enable Row Level Security (RLS)
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;

    -- Create a trigger function to update the `updated_at` column automatically
    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    -- Drop existing trigger if it exists to prevent recreation errors
    DROP TRIGGER IF EXISTS set_users_updated_at ON users;

    -- Create the trigger
    CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

    -- Drop the existing "Admins can manage all users" policy if it exists, as we are replacing it with more granular policies.
    DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;

    -- Policy to allow authenticated Admin users to SELECT all users
    CREATE POLICY "Admins can view all users"
      ON public.users
      FOR SELECT
      TO authenticated
      USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin'));

    -- Policy to allow authenticated Admin users to INSERT new users
    CREATE POLICY "Admins can create users"
      ON public.users
      FOR INSERT
      TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin'));

    -- Policy to allow authenticated Admin users to UPDATE any user
    CREATE POLICY "Admins can update all users"
      ON public.users
      FOR UPDATE
      TO authenticated
      USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin'));

    -- Policy to allow authenticated Admin users to DELETE any user
    CREATE POLICY "Admins can delete users"
      ON public.users
      FOR DELETE
      TO authenticated
      USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin'));

    -- Policy for authenticated users: Can read their own profile
    CREATE POLICY "Authenticated users can read their own profile"
      ON public.users
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);

    -- Policy for authenticated users: Can update their own name
    CREATE POLICY "Authenticated users can update their own name"
      ON public.users
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);