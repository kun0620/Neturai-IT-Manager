/*
  # Ensure Tickets Table Columns, Foreign Keys, and RLS Policies (v4)

  This migration addresses the `23503: insert or update on table "tickets" violates foreign key constraint`
  error by explicitly setting any `created_by` values in the `tickets` table to `NULL` if they
  do not have a corresponding `id` in the `public.users` table. This ensures data consistency
  and allows the foreign key constraint to be successfully re-established. It also continues
  to handle non-UUID values in `created_by` and `assigned_to` by setting them to `NULL` before
  type conversion, renames columns, ensures UUID types, and finally recreates all necessary
  RLS policies for `tickets`, `users`, and `roles` to ensure data integrity and security.

  1. Changes to `tickets` table:
    - Drop default constraints for `created_by` and `assigned_to` if they exist.
    - Rename `user_id` to `created_by` if it exists.
    - **CRITICAL FIX**: Set non-UUID values in `created_by` to `NULL` before casting to UUID.
    - Ensure `created_by` type is UUID.
    - Rename `assignee` to `assigned_to` if it exists.
    - **CRITICAL FIX**: Set non-UUID values in `assigned_to` to `NULL` before casting to UUID.
    - Ensure `assigned_to` type is UUID.
    - Drop existing foreign key constraints for `assigned_to` and `created_by` to `users.id`.
    - **CRITICAL FIX**: Set `created_by` to `NULL` if the referenced user does not exist, to prevent FK violation.
    - Add foreign key constraints for `assigned_to` and `created_by` to `users.id`.
  2. Security:
    - Ensure RLS is enabled on `tickets`, `users`, and `roles` tables.
    - Recreate RLS policies for `tickets` to allow authenticated users to read all tickets, create with their ID, update if assigned or admin, and delete if admin.
    - Recreate RLS policies for `users` to allow authenticated users to read all user data, create their own profile, update their own name, and for Admins to manage all users.
    - Recreate RLS policy for `roles` to allow Admins to view roles.
*/

-- Drop default constraints before type alteration
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'created_by' AND column_default IS NOT NULL) THEN
    ALTER TABLE public.tickets ALTER COLUMN created_by DROP DEFAULT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'assigned_to' AND column_default IS NOT NULL) THEN
    ALTER TABLE public.tickets ALTER COLUMN assigned_to DROP DEFAULT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'user_id' AND column_default IS NOT NULL) THEN
    ALTER TABLE public.tickets ALTER COLUMN user_id DROP DEFAULT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'assignee' AND column_default IS NOT NULL) THEN
    ALTER TABLE public.tickets ALTER COLUMN assignee DROP DEFAULT;
  END IF;
END $$;

-- Rename user_id to created_by and ensure it's UUID
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'user_id') THEN
    ALTER TABLE public.tickets RENAME COLUMN user_id TO created_by;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'created_by' AND data_type != 'uuid') THEN
    -- Set non-UUID values to NULL before casting
    UPDATE public.tickets
    SET created_by = NULL
    WHERE created_by IS NOT NULL
      AND created_by !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    -- Now safely alter column type
    ALTER TABLE public.tickets ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
  END IF;
  -- Re-add default if needed, ensuring it's a valid UUID or NULL
  -- IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'created_by' AND column_default IS NOT NULL) THEN
  --   ALTER TABLE public.tickets ALTER COLUMN created_by SET DEFAULT gen_random_uuid(); -- Or NULL
  -- END IF;
END $$;

-- Rename assignee to assigned_to and ensure it's UUID
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'assignee') THEN
    ALTER TABLE public.tickets RENAME COLUMN assignee TO assigned_to;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'assigned_to' AND data_type != 'uuid') THEN
    -- Set non-UUID values to NULL before casting
    UPDATE public.tickets
    SET assigned_to = NULL
    WHERE assigned_to IS NOT NULL
      AND assigned_to !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    -- Now safely alter column type
    ALTER TABLE public.tickets ALTER COLUMN assigned_to TYPE uuid USING assigned_to::uuid;
  END IF;
  -- Re-add default if needed, ensuring it's a valid UUID or NULL
  -- IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'assigned_to' AND column_default IS NOT NULL) THEN
  --   ALTER TABLE public.tickets ALTER COLUMN assigned_to SET DEFAULT NULL; -- Or a valid UUID
  -- END IF;
END $$;

-- Drop existing foreign key constraints on tickets table if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_assigned_to_fkey' AND conrelid = 'public.tickets'::regclass) THEN
    ALTER TABLE public.tickets DROP CONSTRAINT tickets_assigned_to_fkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_created_by_fkey' AND conrelid = 'public.tickets'::regclass) THEN
    ALTER TABLE public.tickets DROP CONSTRAINT tickets_created_by_fkey;
  END IF;
END $$;

-- CRITICAL FIX: Set created_by to NULL if the referenced user does not exist
-- This prevents foreign key constraint violation when re-adding the FK
UPDATE public.tickets
SET created_by = NULL
WHERE created_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = tickets.created_by);

-- Add foreign key constraints to tickets table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_assigned_to_fkey' AND conrelid = 'public.tickets'::regclass) THEN
    ALTER TABLE public.tickets ADD CONSTRAINT tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_created_by_fkey' AND conrelid = 'public.tickets'::regclass) THEN
    ALTER TABLE public.tickets ADD CONSTRAINT tickets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- Ensure RLS is enabled for tickets, users, and roles tables
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Drop existing RLS policies on tickets table to recreate them
DROP POLICY IF EXISTS "Allow authenticated users to select all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow authenticated users to create tickets with their user_id" ON public.tickets;
DROP POLICY IF EXISTS "Allow authenticated users to update tickets if assigned or admin" ON public.tickets;
DROP POLICY IF EXISTS "Allow authenticated users to delete tickets if admin" ON public.tickets;

-- Recreate RLS policies for tickets table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated users to select all tickets' AND tablename = 'tickets') THEN
    CREATE POLICY "Allow authenticated users to select all tickets"
      ON public.tickets
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated users to create tickets with their user_id' AND tablename = 'tickets') THEN
    CREATE POLICY "Allow authenticated users to create tickets with their user_id"
      ON public.tickets
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = created_by);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated users to update tickets if assigned or admin' AND tablename = 'tickets') THEN
    CREATE POLICY "Allow authenticated users to update tickets if assigned or admin"
      ON public.tickets
      FOR UPDATE
      TO authenticated
      USING (
        auth.uid() = assigned_to OR
        EXISTS (SELECT 1 FROM public.users u JOIN public.roles r ON u.role_id = r.id WHERE u.id = auth.uid() AND r.name = 'Admin')
      )
      WITH CHECK (
        auth.uid() = assigned_to OR
        EXISTS (SELECT 1 FROM public.users u JOIN public.roles r ON u.role_id = r.id WHERE u.id = auth.uid() AND r.name = 'Admin')
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated users to delete tickets if admin' AND tablename = 'tickets') THEN
    CREATE POLICY "Allow authenticated users to delete tickets if admin"
      ON public.tickets
      FOR DELETE
      TO authenticated
      USING (EXISTS (SELECT 1 FROM public.users u JOIN public.roles r ON u.role_id = r.id WHERE u.id = auth.uid() AND r.name = 'Admin'));
  END IF;
END $$;

-- Drop existing RLS policies on users table to recreate them
DROP POLICY IF EXISTS "Authenticated users can read all users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can create their own profile" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can update their own name" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;

-- Recreate RLS policies for users table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read all users' AND tablename = 'users') THEN
    CREATE POLICY "Authenticated users can read all users"
      ON public.users
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can create their own profile' AND tablename = 'users') THEN
    CREATE POLICY "Authenticated users can create their own profile"
      ON public.users
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update their own name' AND tablename = 'users') THEN
    CREATE POLICY "Authenticated users can update their own name"
      ON public.users
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;

  -- Admin policies for users
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all users' AND tablename = 'users') THEN
    CREATE POLICY "Admins can manage all users"
      ON public.users
      FOR ALL
      TO authenticated
      USING (EXISTS (SELECT 1 FROM public.users u JOIN public.roles r ON u.role_id = r.id WHERE u.id = auth.uid() AND r.name = 'Admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.users u JOIN public.roles r ON u.role_id = r.id WHERE u.id = auth.uid() AND r.name = 'Admin'));
  END IF;
END $$;

-- Drop existing RLS policy on roles table to recreate it
DROP POLICY IF EXISTS "Admins can view roles" ON public.roles;

-- Recreate RLS policy for roles table (Admins can view roles)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view roles' AND tablename = 'roles') THEN
    CREATE POLICY "Admins can view roles"
      ON public.roles
      FOR SELECT
      TO authenticated
      USING (EXISTS (SELECT 1 FROM public.users u JOIN public.roles r ON u.role_id = r.id WHERE u.id = auth.uid() AND r.name = 'Admin'));
  END IF;
END $$;