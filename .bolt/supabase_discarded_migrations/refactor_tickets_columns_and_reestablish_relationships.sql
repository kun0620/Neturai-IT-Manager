/*
  # Refactor Tickets Table Columns and Re-establish Relationships

  1. Changes to `tickets` table:
    - Rename `user_id` to `created_by` and ensure its type is UUID.
    - Rename `assignee` to `assigned_to` and ensure its type is UUID.
    - Drop existing foreign key constraints for `assigned_to` and `created_by` to `users.id`.
    - Add foreign key constraints for `assigned_to` and `created_by` to `users.id`.
  2. Security:
    - Ensure RLS is enabled on `tickets` and `users` tables.
    - Recreate RLS policies for `tickets` to allow authenticated users to read all tickets, create with their ID, update if assigned or admin, and delete if admin.
    - Recreate RLS policies for `users` to allow authenticated users to read all user data, create their own profile, update their own name, and for Admins to manage all users.
    - Recreate RLS policy for `roles` to allow Admins to view roles.
*/

-- Rename user_id to created_by and ensure it's UUID
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'user_id') THEN
    ALTER TABLE public.tickets RENAME COLUMN user_id TO created_by;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'created_by' AND data_type != 'uuid') THEN
    ALTER TABLE public.tickets ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
  END IF;
END $$;

-- Rename assignee to assigned_to and ensure it's UUID
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'assignee') THEN
    ALTER TABLE public.tickets RENAME COLUMN assignee TO assigned_to;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'assigned_to' AND data_type != 'uuid') THEN
    -- First, set to NULL if there are non-UUID values, or cast if all are valid UUIDs
    -- For simplicity and safety, we'll assume existing 'text' values might not be valid UUIDs
    -- and set them to NULL before changing type. If you have valid UUIDs as text, adjust this.
    UPDATE public.tickets SET assigned_to = NULL WHERE assigned_to IS NOT NULL AND assigned_to !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    ALTER TABLE public.tickets ALTER COLUMN assigned_to TYPE uuid USING assigned_to::uuid;
  END IF;
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

-- Ensure RLS is enabled for tickets and users tables
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing RLS policies on tickets table to recreate them
DROP POLICY IF EXISTS "Authenticated users can read their own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Authenticated users can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Authenticated users can update their own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow authenticated users to select and update their assigned tickets or if admin" ON public.tickets;
DROP POLICY IF EXISTS "Allow authenticated users to select all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow authenticated users to update tickets if assigned or admin" ON public.tickets;
DROP POLICY IF EXISTS "Allow authenticated users to create tickets with their user_id" ON public.tickets;


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
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can create users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can read their own profile" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can update their own name" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can create their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view roles" ON public.roles; -- Also drop this one if it exists, as it might be related to user roles

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

-- Recreate RLS policy for roles table (Admins can view roles)
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
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