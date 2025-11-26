/*
      # Create tickets table and RLS

      1. New Tables
        - `tickets`
          - `id` (uuid, primary key, default gen_random_uuid())
          - `user_id` (uuid, foreign key to auth.users.id, nullable)
          - `subject` (text, not null)
          - `description` (text, nullable)
          - `category` (enum: 'Hardware', 'Software', 'Network', 'Account', 'General', 'Other', default 'General')
          - `priority` (enum: 'Low', 'Medium', 'High', 'Critical', default 'Low')
          - `status` (enum: 'Open', 'In Progress', 'Closed', 'Resolved', 'Pending', default 'Open')
          - `assignee` (text, nullable)
          - `created_at` (timestamptz, default now())
          - `updated_at` (timestamptz, default now())
      2. Security
        - Enable RLS on `tickets` table
        - Add policy for authenticated users to read their own tickets
        - Add policy for authenticated users to create tickets
        - Add policy for authenticated users to update their own tickets
    */

    CREATE TYPE ticket_category AS ENUM ('Hardware', 'Software', 'Network', 'Account', 'General', 'Other');
    CREATE TYPE ticket_priority AS ENUM ('Low', 'Medium', 'High', 'Critical');
    CREATE TYPE ticket_status AS ENUM ('Open', 'In Progress', 'Closed', 'Resolved', 'Pending');

    CREATE TABLE IF NOT EXISTS tickets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      subject text NOT NULL,
      description text,
      category ticket_category DEFAULT 'General'::ticket_category,
      priority ticket_priority DEFAULT 'Low'::ticket_priority,
      status ticket_status DEFAULT 'Open'::ticket_status,
      assignee text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Authenticated users can read their own tickets"
      ON tickets
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);

    CREATE POLICY "Authenticated users can create tickets"
      ON tickets
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Authenticated users can update their own tickets"
      ON tickets
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);

    -- Function to update updated_at column
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    -- Trigger to call update_updated_at_column on update
    DROP TRIGGER IF EXISTS set_updated_at ON tickets;
    CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
