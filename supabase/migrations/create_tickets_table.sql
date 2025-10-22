/*
      # Create tickets table

      1. New Tables
        - `tickets`
          - `id` (uuid, primary key)
          - `title` (text, not null)
          - `description` (text)
          - `status_id` (uuid, foreign key to `statuses.id`)
          - `category_id` (uuid, foreign key to `categories.id`)
          - `assigned_to` (uuid, foreign key to `profiles.id` or `auth.users.id`)
          - `created_by` (uuid, foreign key to `auth.users.id`)
          - `created_at` (timestamp, default now())
          - `updated_at` (timestamp, default now())
      2. Security
        - Enable RLS on `tickets` table
        - Add policy for authenticated users to read tickets they created or are assigned to
        - Add policy for authenticated users to insert tickets
        - Add policy for authenticated users to update tickets they created or are assigned to
        - Add policy for authenticated users to delete tickets they created
    */

    CREATE TABLE IF NOT EXISTS tickets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL DEFAULT '',
      description text DEFAULT '',
      status_id uuid REFERENCES statuses(id) ON DELETE SET NULL,
      category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
      assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
      created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view their own tickets and assigned tickets.' AND tablename = 'tickets') THEN
        CREATE POLICY "Authenticated users can view their own tickets and assigned tickets."
          ON tickets FOR SELECT
          TO authenticated
          USING (auth.uid() = created_by OR auth.uid() = assigned_to);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can create tickets.' AND tablename = 'tickets') THEN
        CREATE POLICY "Authenticated users can create tickets."
          ON tickets FOR INSERT
          TO authenticated
          WITH CHECK (auth.uid() = created_by);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update their own tickets and assigned tickets.' AND tablename = 'tickets') THEN
        CREATE POLICY "Authenticated users can update their own tickets and assigned tickets."
          ON tickets FOR UPDATE
          TO authenticated
          USING (auth.uid() = created_by OR auth.uid() = assigned_to)
          WITH CHECK (auth.uid() = created_by OR auth.uid() = assigned_to);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can delete their own tickets.' AND tablename = 'tickets') THEN
        CREATE POLICY "Authenticated users can delete their own tickets."
          ON tickets FOR DELETE
          TO authenticated
          USING (auth.uid() = created_by);
      END IF;
    END $$;