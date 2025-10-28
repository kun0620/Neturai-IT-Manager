/*
  # Create assets table and RLS

  1. New Tables
    - `assets`
      - `id` (uuid, primary key, default gen_random_uuid())
      - `name` (text, not null)
      - `asset_code` (text, unique, not null)
      - `serial_number` (text, nullable)
      - `category` (enum: 'Laptop', 'Desktop', 'Monitor', 'Printer', 'Network Device', 'Software License', 'Other', default 'Other')
      - `location` (text, nullable)
      - `status` (enum: 'Available', 'Assigned', 'In Repair', 'Retired', 'Lost', default 'Available')
      - `assigned_to` (uuid, foreign key to auth.users.id, nullable)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
  2. Security
    - Enable RLS on `assets` table
    - Add policy for authenticated users to read all assets
    - Add policy for authenticated users to create assets
    - Add policy for authenticated users to update assets
*/

CREATE TYPE asset_category AS ENUM ('Laptop', 'Desktop', 'Monitor', 'Printer', 'Network Device', 'Software License', 'Other');
CREATE TYPE asset_status AS ENUM ('Available', 'Assigned', 'In Repair', 'Retired', 'Lost');

CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  asset_code text UNIQUE NOT NULL,
  serial_number text,
  category asset_category DEFAULT 'Other'::asset_category,
  location text,
  status asset_status DEFAULT 'Available'::asset_status,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read assets"
  ON assets
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create assets"
  ON assets
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update assets"
  ON assets
  FOR UPDATE
  TO authenticated
  USING (true);

-- Trigger to update updated_at column for assets
DROP TRIGGER IF EXISTS set_assets_updated_at ON assets;
CREATE TRIGGER set_assets_updated_at
BEFORE UPDATE ON assets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();