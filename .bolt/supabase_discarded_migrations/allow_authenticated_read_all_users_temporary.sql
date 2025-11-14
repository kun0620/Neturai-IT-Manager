/*
  # Temporarily allow all authenticated users to read all users table data

  1. Security
    - Add RLS policy to allow all authenticated users to read all data from the `users` table.
    - This is a temporary measure to resolve 400 errors for user and asset queries.
    - This policy is broad and should be refined for production environments to implement more granular column-level or role-based security.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated to read all users (temporary)' AND tablename = 'users') THEN
    CREATE POLICY "Allow authenticated to read all users (temporary)"
      ON public.users
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END
$$;
