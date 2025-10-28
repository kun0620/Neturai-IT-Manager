/*
      # Create ticket_history table and RLS

      1. New Tables
        - `ticket_history`
          - `id` (uuid, primary key, default gen_random_uuid())
          - `ticket_id` (uuid, foreign key to tickets.id, not null)
          - `user_id` (uuid, foreign key to auth.users.id, nullable)
          - `change_type` (text, not null, e.g., 'status_change', 'assignee_change', 'priority_change')
          - `old_value` (text, nullable)
          - `new_value` (text, nullable)
          - `created_at` (timestamptz, default now())
      2. Security
        - Enable RLS on `ticket_history` table
        - Add policy for authenticated users to read history for tickets they can access
        - Add policy for authenticated users to create history entries
    */

    CREATE TABLE IF NOT EXISTS ticket_history (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      change_type text NOT NULL,
      old_value text,
      new_value text,
      created_at timestamptz DEFAULT now()
    );

    ALTER TABLE ticket_history ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Authenticated users can read history for their tickets"
      ON ticket_history
      FOR SELECT
      TO authenticated
      USING (EXISTS (SELECT 1 FROM tickets WHERE tickets.id = ticket_history.ticket_id AND tickets.user_id = auth.uid()));

    CREATE POLICY "Authenticated users can create history entries"
      ON ticket_history
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM tickets WHERE tickets.id = ticket_history.ticket_id AND tickets.user_id = auth.uid()));
