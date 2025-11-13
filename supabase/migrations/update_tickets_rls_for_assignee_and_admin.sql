/*
  # Update Tickets RLS Policies for Assignee and Admin

  This migration updates the Row Level Security (RLS) policies for the `tickets` table
  to allow both the ticket creator (`user_id`), the assigned user (`assignee`),
  and users with the 'Admin' role to perform `SELECT` and `UPDATE` operations.

  The previous policies were too restrictive, only allowing the ticket creator to
  read or update their own tickets, which caused issues in a collaborative Kanban view.

  1. Security
    - Drop existing `SELECT` policy on `tickets`.
    - Drop existing `UPDATE` policy on `tickets`.
    - Recreate `SELECT` policy:
      - Allows `authenticated` users to read tickets if they are the `user_id` (creator),
        the `assignee`, or if they have the 'Admin' role (using `public.is_admin(auth.uid())`).
    - Recreate `UPDATE` policy:
      - Allows `authenticated` users to update tickets if they are the `user_id` (creator),
        the `assignee`, or if they have the 'Admin' role.
      - The `WITH CHECK (NEW.user_id = OLD.user_id)` clause is retained to prevent
        users from changing the original creator of the ticket.
*/

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Authenticated users can read their own tickets" ON public.tickets;

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Authenticated users can update their own tickets" ON public.tickets;

-- Recreate SELECT policy to allow creator, assignee, or admin to read tickets
CREATE POLICY "Allow creator, assignee, or admin to read tickets"
  ON public.tickets
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    auth.uid() = assignee OR
    public.is_admin(auth.uid())
  );

-- Recreate UPDATE policy to allow creator, assignee, or admin to update tickets
CREATE POLICY "Allow creator, assignee, or admin to update tickets"
  ON public.tickets
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    auth.uid() = assignee OR
    public.is_admin(auth.uid())
  )
  WITH CHECK (NEW.user_id = OLD.user_id);
