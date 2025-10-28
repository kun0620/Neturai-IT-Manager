/*
  # Fix Users RLS Infinite Recursion

  1. New Functions
    - `public.is_admin(user_id uuid)`: A security definer function to safely check if a user is an 'Admin' without triggering RLS recursion.
  2. Security
    - Drop existing RLS policies for Admin actions (`Admins can view all users`, `Admins can create users`, `Admins can update all users`, `Admins can delete users`).
    - Recreate these Admin RLS policies to use the new `public.is_admin` function, preventing infinite recursion.
    - Grant `EXECUTE` permission on `public.is_admin` to `authenticated` users.
  3. Changes
    - No changes to table schema.
    - No changes to `Authenticated users can read their own profile` or `Authenticated users can update their own name` policies as they are not recursive.
  4. Important Notes
    - This migration resolves the "infinite recursion detected in policy for relation 'users'" error.
    - Ensure the `public.is_admin` function is owned by `postgres` or a role with `bypass RLS` privileges.
*/

-- Create a security definer function to check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to run with the privileges of its owner (e.g., postgres)
AS $$
BEGIN
  -- This SELECT will bypass RLS on 'public.users' because the function is SECURITY DEFINER
  RETURN EXISTS (SELECT 1 FROM public.users WHERE id = user_id AND role = 'Admin');
END;
$$;

-- Set the owner of the function to postgres (or a role with bypass RLS)
ALTER FUNCTION public.is_admin(uuid) OWNER TO postgres;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- Drop existing Admin RLS policies that caused recursion
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can create users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;

-- Recreate Admin RLS policies using the new is_admin function
CREATE POLICY "Admins can view all users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can create users"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all users"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete users"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- The following policies are already non-recursive and remain unchanged:
-- CREATE POLICY "Authenticated users can read their own profile"
--   ON public.users
--   FOR SELECT
--   TO authenticated
--   USING (auth.uid() = id);

-- CREATE POLICY "Authenticated users can update their own name"
--   ON public.users
--   FOR UPDATE
--   TO authenticated
--   USING (auth.uid() = id)
--   WITH CHECK (auth.uid() = id);