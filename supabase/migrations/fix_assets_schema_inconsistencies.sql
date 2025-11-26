/*
  # Schema update for assets table and foreign key correction

  1. Enum Changes
    - Extend `asset_status` enum to include 'In Use'.
  2. Table Changes
    - `assets` table:
      - Add `description` (text, nullable)
      - Add `image_url` (text, nullable)
      - Add `last_service_date` (timestamptz, nullable)
      - Add `category_id` (uuid, foreign key to `ticket_categories.id`, nullable)
  3. Foreign Key Correction
    - Drop the existing foreign key constraint on `assets.assigned_to` that references `auth.users`.
    - Add a new foreign key constraint `assets_assigned_to_fkey` to the `assets` table,
      linking the `assigned_to` column to the `id` column of the `public.users` table.
      This ensures referential integrity with the custom `users` table.
    - Add foreign key constraint `assets_category_id_fkey` to `ticket_categories.id`.
  4. Important Notes
    - This migration addresses inconsistencies between the database schema and the generated TypeScript types.
*/

-- 1. Extend asset_status enum
DO $$
BEGIN
  -- Check if 'In Use' value already exists in the enum
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'asset_status'::regtype AND enumlabel = 'In Use') THEN
    ALTER TYPE asset_status ADD VALUE 'In Use' AFTER 'Lost';
  END IF;
END
$$;

-- 2. Add missing columns to assets table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'description') THEN
    ALTER TABLE public.assets ADD COLUMN description text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'image_url') THEN
    ALTER TABLE public.assets ADD COLUMN image_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'last_service_date') THEN
    ALTER TABLE public.assets ADD COLUMN last_service_date timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'category_id') THEN
    ALTER TABLE public.assets ADD COLUMN category_id uuid;
  END IF;
END
$$;

-- 3. Correct assigned_to foreign key and add category_id foreign key
DO $$
BEGIN
  -- Drop the existing foreign key constraint if it exists
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.assets'::regclass
      AND conname = 'assets_assigned_to_fkey'
  ) THEN
    ALTER TABLE public.assets
    DROP CONSTRAINT assets_assigned_to_fkey;
  END IF;

  -- Add the correct foreign key constraint to public.users
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.assets'::regclass
      AND conname = 'assets_assigned_to_fkey'
  ) THEN
    ALTER TABLE public.assets
    ADD CONSTRAINT assets_assigned_to_fkey
    FOREIGN KEY (assigned_to) REFERENCES public.users(id)
    ON DELETE SET NULL;
  END IF;

  -- Add foreign key for category_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.assets'::regclass
      AND conname = 'assets_category_id_fkey'
  ) THEN
    ALTER TABLE public.assets
    ADD CONSTRAINT assets_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES public.ticket_categories(id)
    ON DELETE SET NULL;
  END IF;
END
$$;