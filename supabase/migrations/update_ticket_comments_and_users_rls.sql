/*
  # Update RLS policies for ticket_comments and users tables

  1. Modified Tables
    - `ticket_comments`
      - Updated RLS SELECT policy to allow authenticated users to read all comments.
      - Updated RLS INSERT policy to ensure comments are created by the authenticated user.
    - `users`
      - Updated RLS SELECT policy to allow authenticated users to read all user profiles (specifically name and email for display purposes).
  2. Security
    - Drop existing RLS policies for `ticket_comments`.
    - Create new, less restrictive SELECT policy for `ticket_comments`.
    - Drop existing RLS policies for `users`.
    - Create new, less restrictive SELECT policy for `users` to enable joins.
*/

-- Drop existing policies for ticket_comments
DROP POLICY IF EXISTS "Authenticated users can read comments for their tickets" ON public.ticket_comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.ticket_comments;

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


-- Drop existing policies for users
DROP POLICY IF EXISTS "Users can read own data" ON public.users;

-- New policy for users: Authenticated users can read all user profiles (for name/email display)
-- This policy allows authenticated users to read all rows in the 'users' table.
-- This is necessary for joins (e.g., from ticket_comments) to fetch user names/emails.
-- If there are sensitive columns in 'users', consider creating a view or more granular RLS.
CREATE POLICY "Authenticated users can read all user profiles"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);
