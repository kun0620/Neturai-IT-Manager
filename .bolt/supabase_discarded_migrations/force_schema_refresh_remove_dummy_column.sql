/*
  # Force Schema Refresh: Remove Dummy Column from Assets

  1. Changes
    - Remove the temporary `dummy_column` from the `public.assets` table.
      This completes the schema refresh process initiated by adding the column.
  */

  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'dummy_column'
    ) THEN
      ALTER TABLE public.assets DROP COLUMN dummy_column;
    END IF;
  END
  $$;
