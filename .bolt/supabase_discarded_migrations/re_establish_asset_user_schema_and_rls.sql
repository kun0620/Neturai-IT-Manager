/*
  # Re-establish Asset and User Schema with RLS and Foreign Key

  This migration ensures the correct schema, foreign key constraints, and Row Level Security (RLS) policies are in place for the `public.assets` and `public.users` tables.
  It addresses persistent 400 Bad Request errors related to fetching assets with user details by ensuring the relationship and permissions are correctly configured.

  1.  **Permissions**:
      -   Grants `SELECT` permission on `public.users` to `authenticated` role.
      -   Grants `SELECT`, `INSERT`, `UPDATE`, `DELETE` permissions on `public.assets` to `authenticated` role.

  2.  **Foreign Key Constraint**:
      -   Ensures `assets.assigned_to` is a foreign key referencing `users.id`.
      -   Uses `ON DELETE SET NULL` to prevent data loss if a user is deleted.

  3.  **Row Level Security (RLS)**:
      -   Enables RLS for both `public.users` and `public.assets`.
      -   Drops any existing RLS policies for these tables to ensure a clean state.
      -   Creates new RLS policies:
          -   `public.users`: Allows `authenticated` users to `SELECT` all rows. This is necessary for the `assets` table to join and retrieve user names.
          -   `public.assets`:
              -   `SELECT`: Allows `authenticated` users to `SELECT` all assets.
              -   `INSERT`: Allows `authenticated` users to `INSERT` assets.
              -   `UPDATE`: Allows `authenticated` users to `UPDATE` assets.
              -   `DELETE`: Allows `authenticated` users to `DELETE` assets.

  Important Notes:
  -   This migration assumes the `public.users` and `public.assets` tables already exist with the necessary columns (`id`, `name` for `users`, and `assigned_to` for `assets`). If not, prior migrations should have created them.
  -   The RLS policies for `assets` are set to allow authenticated users full CRUD access for simplicity and to resolve the current fetching issues. Further refinement can be done to restrict access based on ownership or roles if needed.
  */

  -- Ensure public.users table exists (assuming it's created by auth trigger or another migration)
  -- And ensure it has 'name' column
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
      CREATE TYPE public.user_role AS ENUM ('Admin', 'Editor', 'Viewer');
    END IF;

    CREATE TABLE IF NOT EXISTS public.users (
      id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email text UNIQUE NOT NULL,
      name text DEFAULT '' NOT NULL,
      role_id uuid REFERENCES public.roles(id) ON DELETE SET NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  END
  $$;

  -- Ensure public.assets table exists
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_category') THEN
      CREATE TYPE public.asset_category AS ENUM ('Laptop', 'Desktop', 'Monitor', 'Printer', 'Network Device', 'Software License', 'Other');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_status') THEN
      CREATE TYPE public.asset_status AS ENUM ('Available', 'Assigned', 'In Repair', 'Retired', 'Lost');
    END IF;

    CREATE TABLE IF NOT EXISTS public.assets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      asset_code text UNIQUE NOT NULL,
      category public.asset_category DEFAULT 'Other'::public.asset_category NOT NULL,
      status public.asset_status DEFAULT 'Available'::public.asset_status NOT NULL,
      assigned_to uuid NULL,
      serial_number text NULL,
      location text NULL,
      last_service_date date NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  END
  $$;

  -- Add/Re-add foreign key constraint for assets.assigned_to to users.id
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assets_assigned_to_fkey') THEN
      ALTER TABLE public.assets
      ADD CONSTRAINT assets_assigned_to_fkey
      FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
  END
  $$;

  -- Enable RLS for public.users
  ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

  -- Drop existing RLS policies for public.users to ensure a clean state
  DROP POLICY IF EXISTS "Users can read own data" ON public.users;
  DROP POLICY IF EXISTS "Allow authenticated users to read all users" ON public.users;
  DROP POLICY IF EXISTS "Allow authenticated users to create their own profile" ON public.users;
  DROP POLICY IF EXISTS "Allow authenticated users to update their own profile" ON public.users;
  DROP POLICY IF EXISTS "Allow authenticated users to delete their own profile" ON public.users;
  DROP POLICY IF EXISTS "Allow admin to manage users" ON public.users;

  -- Create RLS policy for public.users: Allow authenticated users to SELECT all rows
  CREATE POLICY "Allow authenticated users to read all users"
    ON public.users
    FOR SELECT
    TO authenticated
    USING (true);

  -- Create RLS policy for public.users: Allow authenticated users to create their own profile
  CREATE POLICY "Allow authenticated users to create their own profile"
    ON public.users
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

  -- Create RLS policy for public.users: Allow authenticated users to update their own profile
  CREATE POLICY "Allow authenticated users to update their own profile"
    ON public.users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

  -- Enable RLS for public.assets
  ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

  -- Drop existing RLS policies for public.assets to ensure a clean state
  DROP POLICY IF EXISTS "Allow authenticated users to manage assets" ON public.assets;
  DROP POLICY IF EXISTS "Allow authenticated users to read assets" ON public.assets;
  DROP POLICY IF EXISTS "Allow authenticated users to insert assets" ON public.assets;
  DROP POLICY IF EXISTS "Allow authenticated users to update assets" ON public.assets;
  DROP POLICY IF EXISTS "Allow authenticated users to delete assets" ON public.assets;

  -- Create RLS policies for public.assets: Allow authenticated users full CRUD access
  CREATE POLICY "Allow authenticated users to read assets"
    ON public.assets
    FOR SELECT
    TO authenticated
    USING (true);

  CREATE POLICY "Allow authenticated users to insert assets"
    ON public.assets
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

  CREATE POLICY "Allow authenticated users to update assets"
    ON public.assets
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

  CREATE POLICY "Allow authenticated users to delete assets"
    ON public.assets
    FOR DELETE
    TO authenticated
    USING (true);

  -- Grant permissions to authenticated role
  GRANT SELECT ON public.users TO authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.assets TO authenticated;
