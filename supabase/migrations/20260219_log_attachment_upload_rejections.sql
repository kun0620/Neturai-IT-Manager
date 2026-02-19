/*
  # Log rejected attachment uploads

  - Replaces create_ticket_attachment RPC
  - Writes structured rejection logs for policy and permission failures
*/

CREATE OR REPLACE FUNCTION public.create_ticket_attachment(
  p_ticket_id uuid,
  p_file_name text,
  p_storage_path text,
  p_content_type text DEFAULT NULL,
  p_size_bytes bigint DEFAULT 0
)
RETURNS public.ticket_attachments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_max_mb integer := 10;
  v_max_mb_raw text;
  v_allowed_types text := 'image/*';
  v_mime text := lower(coalesce(p_content_type, ''));
  v_ext text := lower(coalesce(substring(coalesce(p_file_name, '') FROM '\.[a-z0-9]+$'), ''));
  v_rule text;
  v_allowed boolean := false;
  v_ticket_access boolean := false;
  v_inserted public.ticket_attachments;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_ticket_id IS NULL OR coalesce(trim(p_storage_path), '') = '' THEN
    INSERT INTO public.logs (user_id, action, details)
    VALUES (
      v_uid,
      'attachment.upload_rejected',
      jsonb_build_object(
        'reason', 'invalid_payload',
        'ticket_id', p_ticket_id,
        'file_name', p_file_name,
        'content_type', p_content_type,
        'size_bytes', p_size_bytes
      )
    );
    RAISE EXCEPTION 'invalid attachment payload';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.tickets t
    WHERE t.id = p_ticket_id
      AND (
        public.is_admin_or_it(v_uid)
        OR t.assigned_to = v_uid
        OR t.created_by = v_uid
      )
  )
  INTO v_ticket_access;

  IF NOT v_ticket_access THEN
    INSERT INTO public.logs (user_id, action, details)
    VALUES (
      v_uid,
      'attachment.upload_rejected',
      jsonb_build_object(
        'reason', 'forbidden_ticket_scope',
        'ticket_id', p_ticket_id,
        'file_name', p_file_name,
        'content_type', p_content_type,
        'size_bytes', p_size_bytes
      )
    );
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT value
  INTO v_max_mb_raw
  FROM public.settings
  WHERE key = 'attachment_max_size_mb'
  LIMIT 1;

  IF v_max_mb_raw ~ '^\d+$' THEN
    v_max_mb := greatest(v_max_mb_raw::integer, 1);
  END IF;

  IF coalesce(p_size_bytes, 0) < 0
    OR coalesce(p_size_bytes, 0) > (v_max_mb * 1024 * 1024) THEN
    INSERT INTO public.logs (user_id, action, details)
    VALUES (
      v_uid,
      'attachment.upload_rejected',
      jsonb_build_object(
        'reason', 'size_exceeds_policy',
        'ticket_id', p_ticket_id,
        'file_name', p_file_name,
        'content_type', p_content_type,
        'size_bytes', p_size_bytes,
        'max_mb', v_max_mb
      )
    );
    RAISE EXCEPTION 'attachment size exceeds policy';
  END IF;

  SELECT coalesce(nullif(value, ''), 'image/*')
  INTO v_allowed_types
  FROM public.settings
  WHERE key = 'attachment_allowed_types'
  LIMIT 1;

  FOR v_rule IN
    SELECT lower(trim(item))
    FROM regexp_split_to_table(v_allowed_types, ',') AS item
    WHERE trim(item) <> ''
  LOOP
    IF v_rule LIKE '.%' THEN
      IF v_ext = v_rule THEN
        v_allowed := true;
        EXIT;
      END IF;
    ELSIF right(v_rule, 2) = '/*' THEN
      IF v_mime LIKE replace(v_rule, '*', '%') THEN
        v_allowed := true;
        EXIT;
      END IF;

      IF v_rule = 'image/*'
        AND v_ext IN ('.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg', '.tif', '.tiff', '.heic', '.heif', '.avif') THEN
        v_allowed := true;
        EXIT;
      END IF;
    ELSE
      IF v_mime = v_rule THEN
        v_allowed := true;
        EXIT;
      END IF;
    END IF;
  END LOOP;

  IF NOT v_allowed THEN
    INSERT INTO public.logs (user_id, action, details)
    VALUES (
      v_uid,
      'attachment.upload_rejected',
      jsonb_build_object(
        'reason', 'type_not_allowed',
        'ticket_id', p_ticket_id,
        'file_name', p_file_name,
        'content_type', p_content_type,
        'size_bytes', p_size_bytes,
        'allowed_types', v_allowed_types
      )
    );
    RAISE EXCEPTION 'attachment type is not allowed';
  END IF;

  INSERT INTO public.ticket_attachments (
    ticket_id,
    uploaded_by,
    file_name,
    storage_path,
    content_type,
    size_bytes
  ) VALUES (
    p_ticket_id,
    v_uid,
    coalesce(nullif(trim(p_file_name), ''), 'attachment'),
    p_storage_path,
    nullif(trim(p_content_type), ''),
    coalesce(p_size_bytes, 0)
  )
  RETURNING *
  INTO v_inserted;

  RETURN v_inserted;
END;
$$;
