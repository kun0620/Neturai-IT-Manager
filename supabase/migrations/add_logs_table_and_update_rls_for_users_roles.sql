/*
      # Add Logs Table and Update RLS for Users and Roles

      This migration introduces a `logs` table to record system activities,
      especially user role changes. It also refines Row Level Security (RLS)
      policies for `public.users` and `public.roles` to support Admin user management.

      1. New Tables
        - `logs`
          - `id` (uuid, primary key)
          - `created_at` (timestamptz, default now())
          - `user_id` (uuid, foreign key to `public.users.id`, nullable)
          - `action` (text, describes the action, e.g., 'USER_CREATED', 'USER_ROLE_UPDATED')
          - `details` (jsonb, stores additional context about the action)

      2. Security
        - **`public.users`**:
          - Drop existing `SELECT` policy.
          - Create `SELECT` policy: Allow authenticated users to read all user data.
          - Create `INSERT` policy: Allow authenticated users to insert if they are an Admin (handled by Edge Function).
          - Create `UPDATE` policy: Allow authenticated users to update their own profile OR if they are an Admin.
          - Create `DELETE` policy: Allow authenticated users to delete if they are an Admin (handled by Edge Function).
        - **`public.roles`**:
          - Drop existing `SELECT` policy.
          - Create `SELECT` policy: Allow authenticated users to read all roles.
          - Create `INSERT`, `UPDATE`, `DELETE` policies: Only allow if `auth.uid()` is an Admin.
        - **`public.logs`**:
          - Enable RLS.
          - Create `SELECT` policy: Allow authenticated users to read all logs if they are an Admin.
          - Create `INSERT` policy: Allow authenticated users to insert logs (primarily via Edge Functions).

      3. Data Initialization
        - Ensure default roles ('Admin', 'IT Support', 'Viewer') exist in `public.roles`.
    */

    -- Ensure the 'is_admin' function exists for RLS policies
    CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      user_role_name text;
    BEGIN
      SELECT r.name INTO user_role_name
      FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = user_id;

      RETURN user_role_name = 'Admin';
    END;
    $$;

    -- 1. Create `logs` table
    CREATE TABLE IF NOT EXISTS public.logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamptz DEFAULT now(),
      user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
      action text NOT NULL,
      details jsonb
    );

    -- 2. Update RLS for `public.users`
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow authenticated users to read all users" ON public.users;
    DROP POLICY IF EXISTS "Allow authenticated users to insert their own profile" ON public.users;
    DROP POLICY IF EXISTS "Allow authenticated users to update their own profile" ON public.users;
    DROP POLICY IF EXISTS "Allow authenticated users to delete their own profile" ON public.users;

    CREATE POLICY "Admins can manage all users"
      ON public.users
      FOR ALL
      TO authenticated
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));

    CREATE POLICY "Users can read own profile"
      ON public.users
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);

    CREATE POLICY "Users can update own profile"
      ON public.users
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);

    -- 3. Update RLS for `public.roles`
    ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow authenticated users to read all roles" ON public.roles;
    DROP POLICY IF EXISTS "Allow anon users to read roles" ON public.roles;

    CREATE POLICY "Admins can manage all roles"
      ON public.roles
      FOR ALL
      TO authenticated
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));

    CREATE POLICY "Authenticated users can read roles"
      ON public.roles
      FOR SELECT
      TO authenticated
      USING (true);

    CREATE POLICY "Anon users can read roles"
      ON public.roles
      FOR SELECT
      TO anon
      USING (true);

    -- 4. RLS for `public.logs`
    ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Admins can read all logs"
      ON public.logs
      FOR SELECT
      TO authenticated
      USING (public.is_admin(auth.uid()));

    CREATE POLICY "Admins can insert logs"
      ON public.logs
      FOR INSERT
      TO authenticated
      WITH CHECK (public.is_admin(auth.uid()));

    -- 5. Ensure default roles exist
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'Admin') THEN
        INSERT INTO public.roles (name) VALUES ('Admin');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'IT Support') THEN
        INSERT INTO public.roles (name) VALUES ('IT Support');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'Viewer') THEN
        INSERT INTO public.roles (name) VALUES ('Viewer');
      END IF;
    END $$;
