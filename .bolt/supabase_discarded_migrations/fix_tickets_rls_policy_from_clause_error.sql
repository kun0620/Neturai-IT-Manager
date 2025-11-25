/*
  # Fix Tickets RLS Policy: Missing FROM-clause entry for table NEW

  This migration addresses the `ERROR: 42P01: missing FROM-clause entry for table "new"`
  by simplifying the `WITH CHECK` clause in the RLS policy for `UPDATE` operations
  on the `tickets` table.

  The previous policy's `WITH CHECK` clause included `auth.uid() = user_id` which is
  redundant given the `USING` clause already enforces this. The error suggests a parsing
  issue when `NEW` and `OLD` were combined with other conditions in the `WITH CHECK`.

  1. Security
    - Drop the existing `Authenticated users can update their own tickets` policy.
    - Recreate the `UPDATE` policy.
    - The `USING` clause remains `auth.uid() = user_id` to ensure users can only update their own tickets.
    - The `WITH CHECK` clause is simplified to `NEW.user_id = OLD.user_id` to specifically prevent
      the `user_id` column from being changed during the update. This ensures that a user
      cannot reassign a ticket they own to another user or to NULL.
*/

-- Drop the existing update policy
DROP POLICY IF EXISTS "Authenticated users can update their own tickets" ON public.tickets;

-- Recreate the update policy with a simplified WITH CHECK to prevent user_id changes
CREATE POLICY "Authenticated users can update their own tickets"
  ON public.tickets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (NEW.user_id = OLD.user_id);
