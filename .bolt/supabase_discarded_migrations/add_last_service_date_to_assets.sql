/*
  # Add last_service_date to assets table

  1. Modified Tables
    - `assets`
      - Add `last_service_date` (timestamptz, nullable)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'last_service_date'
  ) THEN
    ALTER TABLE public.assets ADD COLUMN last_service_date timestamptz;
  END IF;
END $$;
