/*
      # Schema update for assets table

      1. Modified Tables
        - `assets`
          - Add `serial_number` (text, nullable)
          - Add `location` (text, nullable)
          - Add `category` (text, nullable, default 'Other')
          - Update `status` column to use an expanded `asset_status` enum.
      2. Enums
        - Create `asset_status_expanded` enum with values: 'Available', 'Assigned', 'In Repair', 'Retired', 'Lost', 'In Use'.
        - Migrate `assets.status` to use `asset_status_expanded`.
        - Drop old `asset_status` enum.
        - Rename `asset_status_expanded` to `asset_status`.
      3. Important Notes
        - The `category_id` column will remain but will no longer be used by the AssetFormDialog. The new `category` column will be used instead.
        - Existing `status` values will be preserved during the enum migration.
    */

    -- 1. Add new columns if they don't exist
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'serial_number') THEN
        ALTER TABLE public.assets ADD COLUMN serial_number text NULL;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'location') THEN
        ALTER TABLE public.assets ADD COLUMN location text NULL;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'category') THEN
        ALTER TABLE public.assets ADD COLUMN category text NOT NULL DEFAULT 'Other';
      END IF;
    END $$;

    -- 2. Update asset_status enum
    -- Create a new enum type with all desired values
    CREATE TYPE public.asset_status_expanded AS ENUM ('Available', 'Assigned', 'In Repair', 'Retired', 'Lost', 'In Use');

    -- Alter the 'status' column in 'assets' table to use the new enum type
    -- This requires a cast, and existing values must be compatible or mapped.
    -- Assuming existing values ('In Use', 'In Repair', 'Retired', 'Available') are present in the new enum.
    ALTER TABLE public.assets ALTER COLUMN status TYPE public.asset_status_expanded USING status::text::public.asset_status_expanded;

    -- Drop the old enum type
    DROP TYPE public.asset_status;

    -- Rename the new enum type to the original name
    ALTER TYPE public.asset_status_expanded RENAME TO asset_status;
