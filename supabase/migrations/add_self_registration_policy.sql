/*
  # Add self-registration policy for users table

  1. Security
    - Add RLS policy to allow authenticated users to create their own profile in the `public.users` table,
      ensuring the `id` matches their `auth.uid()`.
*/

CREATE POLICY "Authenticated users can create their own profile"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);