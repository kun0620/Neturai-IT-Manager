/*
  # Create repairs table and RLS

  1. New Tables
    - `repairs`
      - `id` (uuid, primary key, default gen_random_uuid())
      - `asset_id` (uuid, foreign key to assets.id, not null)
      - `description` (text, not null)
      - `repair_date` (timestamptz, default now())
      - `cost` (numeric, default 0)
      - `status` (enum: 'Pending', 'In Progress', 'Completed', 'Cancelled', default 'Pending')
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
  2. Security
    - Enable RLS on `repairs` table
    - Add policy for authenticated users to read repairs
    - Add policy for authenticated users to create repairs
    - Add policy for authenticated users to update repairs
*/

CREATE TYPE repair_status AS ENUM ('Pending', 'In Progress', 'Completed', 'Cancelled');

CREATE TABLE IF NOT EXISTS repairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid REFERENCES assets(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  repair_date timestamptz DEFAULT now(),
  cost numeric DEFAULT 0,
  status repair_status DEFAULT 'Pending'::repair_status,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE repairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read repairs"
  ON repairs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create repairs"
  ON repairs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update repairs"
  ON repairs
  FOR UPDATE
  TO authenticated
  USING (true);

-- Trigger to update updated_at column for repairs
DROP TRIGGER IF EXISTS set_repairs_updated_at ON repairs;
CREATE TRIGGER set_repairs_updated_at
BEFORE UPDATE ON repairs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
