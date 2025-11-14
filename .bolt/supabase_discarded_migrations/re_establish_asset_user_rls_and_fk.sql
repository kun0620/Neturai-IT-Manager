/*
  # Re-establish RLS Policies and Foreign Key for Assets and Users

  This migration aims to definitively resolve persistent 400 errors related to the
  `assets` and `users` tables by ensuring RLS policies are correctly applied
  and the foreign key relationship is recognized.

  1. Security
    - Drop ALL existing RLS policies on `public.users` and `public.assets` to prevent conflicts.
    - Re-enable RLS on both `public.users` and `public.assets`.
    - Create a permissive `SELECT` policy for `authenticated` users on `public.users` (allowing all reads).
    - Create permissive `SELECT`, `INSERT`, `UPDATE`, `DELETE` policies for `authenticated` users on `public.assets` (allowing all operations).
    - Explicitly grant `SELECT` permission on `public.users` and `public.assets` to the `authenticated` role.
  2. Changes
    - Ensure the foreign key constraint `assets_assigned_to_fkey` linking `assets.assigned_to` to `users.id` is in place.
  */

  -- Drop all existing RLS policies for public.users
  DO $$ DECLARE r record;
  BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public')
    LOOP
      EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.users;';
    END LOOP;
  END $$;

  -- Ensure RLS is enabled on public.users
  ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

  -- Create a policy to allow authenticated users to read all users
  CREATE POLICY "Allow authenticated to read all users"
    ON public.users
    FOR SELECT
    TO authenticated
    USING (true);

  -- Grant explicit SELECT permission to authenticated role on public.users
  GRANT SELECT ON public.users TO authenticated;


  -- Drop all existing RLS policies for public.assets
  DO $$ DECLARE r record;
  BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'assets' AND schemaname = 'public')
    LOOP
      EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.assets;';
    END LOOP;
  END $$;

  -- Ensure RLS is enabled on public.assets
  ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

  -- Create policies for public.assets
  CREATE POLICY "Authenticated users can read assets"
    ON public.assets
    FOR SELECT
    TO authenticated
    USING (true);

  CREATE POLICY "Authenticated users can create assets"
    ON public.assets
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

  CREATE POLICY "Authenticated users can update assets"
    ON public.assets
    FOR UPDATE
    TO authenticated
    USING (true);

  CREATE POLICY "Authenticated users can delete assets"
    ON public.assets
    FOR DELETE
    TO authenticated
    USING (true);

  -- Grant explicit SELECT permission to authenticated role on public.assets
  GRANT SELECT ON public.assets TO authenticated;


  -- Ensure the foreign key constraint assets_assigned_to_fkey exists
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'assets_assigned_to_fkey' AND conrelid = 'public.assets'::regclass
    ) THEN
      ALTER TABLE public.assets
      ADD CONSTRAINT assets_assigned_to_fkey
      FOREIGN KEY (assigned_to) REFERENCES public.users(id)
      ON DELETE SET NULL;
    END IF;
  END
  $$;
