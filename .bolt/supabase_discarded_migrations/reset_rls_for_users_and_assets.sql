/*
      # Reset RLS for Users and Assets

      This migration aims to resolve persistent 500 (Internal Server Error) for `users` table queries
      and 400 (Bad Request) for `assets` table queries by resetting Row Level Security (RLS) policies
      to a minimal, read-all state for authenticated users and ensuring the foreign key constraint.

      1. Security
        - Drop all existing RLS policies on `public.users` to ensure a clean slate.
        - Enable RLS on `public.users`.
        - Create a simple `SELECT` policy for `public.users` to allow authenticated users to read all user data.
        - Drop all existing RLS policies on `public.assets` to ensure a clean slate.
        - Enable RLS on `public.assets`.
        - Create a simple `SELECT` policy for `public.assets` to allow authenticated users to read all asset data.

      2. Foreign Key
        - Ensure the foreign key `assets_assigned_to_fkey` exists, linking `assets.assigned_to` to `users.id`.
    */

    -- Drop all existing RLS policies on public.users
    DROP POLICY IF EXISTS "Allow authenticated users to read all user data for assignment" ON public.users;
    DROP POLICY IF EXISTS "Allow authenticated users to insert their own profile" ON public.users;
    DROP POLICY IF EXISTS "Allow authenticated users to update their own profile" ON public.users;
    DROP POLICY IF EXISTS "Allow authenticated users to delete their own profile" ON public.users;
    DROP POLICY IF EXISTS "Users can read own data" ON public.users;
    DROP POLICY IF EXISTS "Allow authenticated users to read all user data" ON public.users;
    DROP POLICY IF EXISTS "Allow authenticated users to insert their own profile" ON public.users;
    DROP POLICY IF EXISTS "Allow authenticated users to update their own profile" ON public.users;
    DROP POLICY IF EXISTS "Allow authenticated users to delete their own profile" ON public.users;

    -- Enable RLS on public.users
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

    -- Policy for public.users: Allow authenticated users to read all user data
    CREATE POLICY "Allow authenticated users to read all users"
      ON public.users
      FOR SELECT
      TO authenticated
      USING (true);

    -- Drop all existing RLS policies on public.assets
    DROP POLICY IF EXISTS "Allow authenticated users to manage assets" ON public.assets;
    DROP POLICY IF EXISTS "Allow authenticated users to read all assets" ON public.assets;
    DROP POLICY IF EXISTS "Allow authenticated users to insert assets" ON public.assets;
    DROP POLICY IF EXISTS "Allow authenticated users to update assets" ON public.assets;
    DROP POLICY IF EXISTS "Allow authenticated users to delete assets" ON public.assets;

    -- Enable RLS on public.assets
    ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

    -- Policy for public.assets: Allow authenticated users to read all assets
    CREATE POLICY "Allow authenticated users to read all assets"
      ON public.assets
      FOR SELECT
      TO authenticated
      USING (true);

    -- Ensure foreign key constraint exists
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assets_assigned_to_fkey') THEN
        ALTER TABLE public.assets
        ADD CONSTRAINT assets_assigned_to_fkey
        FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;
      END IF;
    END $$;
