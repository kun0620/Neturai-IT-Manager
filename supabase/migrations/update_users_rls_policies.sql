/*
      # Update RLS Policies for users table

      1. Security
        - Drop existing "Admins can manage all users" policy.
        - Add new RLS policy "Admins can view all users" to allow authenticated Admin users to SELECT all rows in the `users` table.
        - Add new RLS policy "Admins can create users" to allow authenticated Admin users to INSERT new rows into the `users` table.
        - Add new RLS policy "Admins can update all users" to allow authenticated Admin users to UPDATE any row in the `users` table.
        - Add new RLS policy "Admins can delete users" to allow authenticated Admin users to DELETE any row from the `users` table.
        - Keep existing "Authenticated users can read own profile" policy.
        - Keep existing "Authenticated users can update own name" policy.

      2. Important Notes
        - Ensure you have at least one user with `role = 'Admin'` in the `users` table to test admin functionalities.
        - Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correctly set in your `.env` file.
    */

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

    -- Keep existing policy for authenticated users to read their own profile
    -- CREATE POLICY "Authenticated users can read own profile"
    --   ON public.users
    --   FOR SELECT
    --   TO authenticated
    --   USING (auth.uid() = id);

    -- Keep existing policy for authenticated users to update their own name
    -- CREATE POLICY "Authenticated users can update own name"
    --   ON public.users
    --   FOR UPDATE
    --   TO authenticated
    --   USING (auth.uid() = id)
    --   WITH CHECK (auth.uid() = id);
