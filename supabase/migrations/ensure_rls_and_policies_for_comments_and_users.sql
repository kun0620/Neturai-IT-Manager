/*
  # Ensure RLS and Policies for ticket_comments and users tables

  1. Modified Tables
    - `ticket_comments`
      - Explicitly enable RLS.
      - Updated RLS SELECT policy to allow authenticated users to read all comments.
      - Updated RLS INSERT policy to ensure comments are created by the authenticated user.
    - `users`
      - Explicitly enable RLS.
      - Updated RLS SELECT policy to allow authenticated users to read all user profiles (specifically name and email for display purposes).
  2. Security
    - Ensure RLS is enabled for `ticket_comments`.
    - Drop existing RLS policies for `ticket_comments`.
    - Create new, less restrictive SELECT policy for `ticket_comments`.
    - Ensure RLS is enabled for `users`.
    - Drop existing RLS policies for `users`.
    - Create new, less restrictive SELECT policy for `users` to enable joins.
*/

-- Ensure RLS is enabled for ticket_comments
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for ticket_comments
DROP POLICY IF EXISTS "Authenticated users can read comments for their tickets" ON public.ticket_comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.ticket_comments;
DROP POLICY IF EXISTS "Authenticated users can read all ticket comments" ON public.ticket_comments;
DROP POLICY IF EXISTS "Authenticated users can create their own ticket comments" ON public.ticket_comments;

-- New policy for ticket_comments: Authenticated users can read all comments
CREATE POLICY "Authenticated users can read all ticket comments"
  ON public.ticket_comments
  FOR SELECT
  TO authenticated
  USING (true);

-- New policy for ticket_comments: Authenticated users can create comments
CREATE POLICY "Authenticated users can create their own ticket comments"
  ON public.ticket_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);


-- Ensure RLS is enabled for users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for users
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can read all user profiles" ON public.users;

-- New policy for users: Authenticated users can read all user profiles (for name/email display)
CREATE POLICY "Authenticated users can read all user profiles"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);