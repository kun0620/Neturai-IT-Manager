/*
      # Create ticket_comments table and RLS

      1. New Tables
        - `ticket_comments`
          - `id` (uuid, primary key, default gen_random_uuid())
          - `ticket_id` (uuid, foreign key to tickets.id, not null)
          - `user_id` (uuid, foreign key to auth.users.id, nullable)
          - `comment_text` (text, not null)
          - `created_at` (timestamptz, default now())
      2. Security
        - Enable RLS on `ticket_comments` table
        - Add policy for authenticated users to read comments for tickets they can access
        - Add policy for authenticated users to create comments
    */

    CREATE TABLE IF NOT EXISTS ticket_comments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      comment_text text NOT NULL,
      created_at timestamptz DEFAULT now()
    );

    ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Authenticated users can read comments for their tickets"
      ON ticket_comments
      FOR SELECT
      TO authenticated
      USING (EXISTS (SELECT 1 FROM tickets WHERE tickets.id = ticket_comments.ticket_id AND tickets.user_id = auth.uid()));

    CREATE POLICY "Authenticated users can create comments"
      ON ticket_comments
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM tickets WHERE tickets.id = ticket_comments.ticket_id AND tickets.user_id = auth.uid()));
