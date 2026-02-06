/*
  # Update ticket_categories RLS to allow admin + it manage

  - Adds a security definer function `public.is_admin_or_it(uuid)`
  - Updates manage policy on `public.ticket_categories` to allow admin/it roles
*/

-- Create a security definer function to check admin or IT role via profiles
CREATE OR REPLACE FUNCTION public.is_admin_or_it(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = user_id;

  RETURN user_role IN ('admin', 'it');
END;
$$;

-- Ensure the owner can bypass RLS
ALTER FUNCTION public.is_admin_or_it(uuid) OWNER TO postgres;

-- Allow authenticated users to execute the function
GRANT EXECUTE ON FUNCTION public.is_admin_or_it(uuid) TO authenticated;

-- Update manage policy for ticket_categories
DROP POLICY IF EXISTS "Allow admin manage ticket_categories" ON public.ticket_categories;
DROP POLICY IF EXISTS "Allow admin/it manage ticket_categories" ON public.ticket_categories;
CREATE POLICY "Allow admin/it manage ticket_categories"
  ON public.ticket_categories
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_it(auth.uid()))
  WITH CHECK (public.is_admin_or_it(auth.uid()));
