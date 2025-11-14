/*
  # Initial Schema for IT Operations Dashboard

  1. New Tables
    - `tickets`
      - `id` (uuid, primary key, default gen_random_uuid())
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
      - `subject` (text, not null, default '')
      - `description` (text, default '')
      - `status` (text, not null, default 'Open', check constraint for allowed values)
      - `category` (text, not null, default 'General', check constraint for allowed values)
      - `priority` (text, not null, default 'Medium', check constraint for allowed values)
      - `assignee` (text, default '')
      - `user_id` (uuid, foreign key to auth.users.id)
    - `assets`
      - `id` (uuid, primary key, default gen_random_uuid())
      - `created_at` (timestamptz, default now())
      - `name` (text, not null, default '')
      - `type` (text, not null, default 'Hardware', check constraint for allowed values)
      - `status` (text, not null, default 'In Use', check constraint for allowed values)
      - `assigned_to` (text, default '')
      - `purchase_date` (date)
      - `warranty_end_date` (date)
  2. Security
    - Enable RLS on `tickets` table
    - Add RLS policies for `tickets`:
      - Authenticated users can `SELECT` all tickets.
      - Authenticated users can `INSERT` tickets.
      - Authenticated users can `UPDATE` their own tickets.
    - Enable RLS on `assets` table
    - Add RLS policies for `assets`:
      - Authenticated users can `SELECT` all assets.
*/

-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  subject text NOT NULL DEFAULT '',
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'Open',
  category text NOT NULL DEFAULT 'General',
  priority text NOT NULL DEFAULT 'Medium',
  assignee text DEFAULT '',
  user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- Add check constraints for status, category, and priority
ALTER TABLE tickets ADD CONSTRAINT check_ticket_status CHECK (status IN ('Open', 'In Progress', 'Closed', 'Resolved', 'Pending'));
ALTER TABLE tickets ADD CONSTRAINT check_ticket_category CHECK (category IN ('Hardware', 'Software', 'Network', 'Account', 'General', 'Other'));
ALTER TABLE tickets ADD CONSTRAINT check_ticket_priority CHECK (priority IN ('Low', 'Medium', 'High', 'Critical'));

-- Enable Row Level Security for tickets
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to select all tickets
CREATE POLICY "Authenticated users can view all tickets"
  ON tickets
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy for authenticated users to insert tickets
CREATE POLICY "Authenticated users can create tickets"
  ON tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy for authenticated users to update their own tickets
  ON tickets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create assets table
CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  name text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'Hardware',
  status text NOT NULL DEFAULT 'In Use',
  assigned_to text DEFAULT '',
  purchase_date date,
  warranty_end_date date
);

-- Add check constraints for asset type and status
ALTER TABLE assets ADD CONSTRAINT check_asset_type CHECK (type IN ('Hardware', 'Software License', 'Network Device', 'Peripheral', 'Other'));
ALTER TABLE assets ADD CONSTRAINT check_asset_status CHECK (status IN ('In Use', 'Available', 'Maintenance', 'Retired', 'Lost'));

-- Enable Row Level Security for assets
ALTER TABLE assets ENABLE ROW SECURITY;

-- Policy for authenticated users to select all assets
CREATE POLICY "Authenticated users can view all assets"
  ON assets
  FOR SELECT
  TO authenticated
  USING (true);

-- Function to update `updated_at` column automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for tickets table
CREATE OR REPLACE TRIGGER update_tickets_updated_at
BEFORE UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
