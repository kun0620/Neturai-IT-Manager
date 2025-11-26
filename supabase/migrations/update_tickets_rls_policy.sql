/*
  # Update Tickets RLS Policy

  This migration addresses the `PATCH 406 (Not Acceptable)` error by refining the RLS policy
  for `UPDATE` operations on the `tickets` table.

  1. Security
    - Drop the existing `Authenticated users can update their own tickets` policy.
    - Recreate the `UPDATE` policy to explicitly include a `WITH CHECK` clause that ensures:
      - The authenticated user (`auth.uid()`) is the owner of the ticket (`user_id`).
      - The `user_id` column cannot be changed during the update (`NEW.user_id = OLD.user_id`).
      This prevents users from reassigning tickets they own to other users or to NULL.
*/

-- Drop the existing update policy
DROP POLICY IF EXISTS "Authenticated users can update their own tickets" ON public.tickets;

-- Recreate the update policy with explicit WITH CHECK to prevent user_id changes
CREATE POLICY "Authenticated users can update their own tickets"
  ON public.tickets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND NEW.user_id = OLD.user_id);
