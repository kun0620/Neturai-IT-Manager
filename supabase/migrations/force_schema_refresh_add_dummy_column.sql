/*
  # Force Schema Refresh: Add Dummy Column to Assets

  1. Changes
    - Add a temporary `dummy_column` (text, nullable) to the `public.assets` table.
      This is a non-breaking change intended to force Supabase's PostgREST to refresh its schema cache.
  */

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'dummy_column'
    ) THEN
      ALTER TABLE public.assets ADD COLUMN dummy_column text;
    END IF;
  END
  $$;
