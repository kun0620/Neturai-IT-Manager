/*
  # Add ticket attachment system

  - Table: public.ticket_attachments
  - Bucket: storage.ticket-attachments
  - RLS policies for table and storage objects
*/

CREATE TABLE IF NOT EXISTS public.ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  content_type text,
  size_bytes bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id
  ON public.ticket_attachments (ticket_id, created_at DESC);

ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ticket_attachments_select" ON public.ticket_attachments;
CREATE POLICY "ticket_attachments_select"
ON public.ticket_attachments
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.tickets t
    WHERE t.id = ticket_attachments.ticket_id
      AND (
        public.is_admin_or_it(auth.uid())
        OR t.assigned_to = auth.uid()
        OR t.created_by = auth.uid()
      )
  )
);

DROP POLICY IF EXISTS "ticket_attachments_insert" ON public.ticket_attachments;
CREATE POLICY "ticket_attachments_insert"
ON public.ticket_attachments
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.tickets t
    WHERE t.id = ticket_attachments.ticket_id
      AND (
        public.is_admin_or_it(auth.uid())
        OR t.assigned_to = auth.uid()
        OR t.created_by = auth.uid()
      )
  )
);

DROP POLICY IF EXISTS "ticket_attachments_delete" ON public.ticket_attachments;
CREATE POLICY "ticket_attachments_delete"
ON public.ticket_attachments
FOR DELETE
USING (
  auth.uid() IS NOT NULL
  AND (
    public.is_admin_or_it(auth.uid())
    OR uploaded_by = auth.uid()
  )
);

INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "ticket_attachments_storage_select" ON storage.objects;
CREATE POLICY "ticket_attachments_storage_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'ticket-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.ticket_attachments ta
    JOIN public.tickets t ON t.id = ta.ticket_id
    WHERE ta.storage_path = storage.objects.name
      AND (
        public.is_admin_or_it(auth.uid())
        OR t.assigned_to = auth.uid()
        OR t.created_by = auth.uid()
      )
  )
);

DROP POLICY IF EXISTS "ticket_attachments_storage_insert" ON storage.objects;
CREATE POLICY "ticket_attachments_storage_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ticket-attachments'
);

DROP POLICY IF EXISTS "ticket_attachments_storage_delete" ON storage.objects;
CREATE POLICY "ticket_attachments_storage_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'ticket-attachments'
  AND (
    public.is_admin_or_it(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.ticket_attachments ta
      WHERE ta.storage_path = storage.objects.name
        AND ta.uploaded_by = auth.uid()
    )
  )
);
