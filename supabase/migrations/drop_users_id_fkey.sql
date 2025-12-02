/*
  # Drop problematic self-referencing foreign key from users table

  1. Modified Tables
    - `users`
      - Drop the `users_id_fkey` foreign key, which is a self-referencing key from `users.id` to `users.id`. This key is redundant and potentially causing issues with PostgREST joins.
  2. Important Notes
    - This foreign key is not necessary for the application's functionality and appears to be an artifact that could be interfering with database queries, specifically joins involving the `users` table.
*/

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_id_fkey') THEN
    ALTER TABLE public.users DROP CONSTRAINT users_id_fkey;
  END IF;
END $$;