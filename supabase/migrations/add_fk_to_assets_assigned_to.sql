/*
  # Add Foreign Key Constraint to assets.assigned_to

  1. Changes
    - Add a foreign key constraint `assets_assigned_to_fkey` to the `assets` table,
      linking the `assigned_to` column to the `id` column of the `users` table.
      This ensures referential integrity and helps Supabase recognize the relationship.
  */

  DO $$
  BEGIN
    -- Check if the foreign key constraint already exists before adding it
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'assets_assigned_to_fkey'
    ) THEN
      ALTER TABLE public.assets
      ADD CONSTRAINT assets_assigned_to_fkey
      FOREIGN KEY (assigned_to) REFERENCES public.users(id)
      ON DELETE SET NULL; -- Or ON DELETE CASCADE, depending on desired behavior
    END IF;
  END
  $$;
