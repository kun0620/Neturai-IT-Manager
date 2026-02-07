/*
  # Update ticket with logs (transactional)

  This function updates a ticket and writes audit logs in the same transaction.
*/

CREATE OR REPLACE FUNCTION public.update_ticket_with_logs(
  p_id uuid,
  p_updates jsonb,
  p_user_id uuid
)
RETURNS public.tickets
LANGUAGE plpgsql
AS $$
DECLARE
  old_status public.ticket_status;
  old_assigned_to uuid;
  old_due_at timestamptz;
  updated_row public.tickets;
BEGIN
  SELECT status, assigned_to, due_at
    INTO old_status, old_assigned_to, old_due_at
  FROM public.tickets
  WHERE id = p_id
  FOR UPDATE;

  UPDATE public.tickets
  SET
    title = CASE WHEN p_updates ? 'title' THEN p_updates->>'title' ELSE title END,
    description = CASE WHEN p_updates ? 'description' THEN p_updates->>'description' ELSE description END,
    category_id = CASE
      WHEN p_updates ? 'category_id' THEN NULLIF(p_updates->>'category_id', '')::uuid
      ELSE category_id
    END,
    priority = CASE
      WHEN p_updates ? 'priority' THEN (p_updates->>'priority')::public.ticket_priority_enum
      ELSE priority
    END,
    status = CASE
      WHEN p_updates ? 'status' THEN (p_updates->>'status')::public.ticket_status
      ELSE status
    END,
    assigned_to = CASE
      WHEN p_updates ? 'assigned_to' THEN NULLIF(p_updates->>'assigned_to', '')::uuid
      ELSE assigned_to
    END,
    due_at = CASE
      WHEN p_updates ? 'due_at' THEN (p_updates->>'due_at')::timestamptz
      ELSE due_at
    END,
    resolved_at = CASE
      WHEN p_updates ? 'resolved_at' THEN (p_updates->>'resolved_at')::timestamptz
      ELSE resolved_at
    END,
    updated_at = CASE
      WHEN p_updates ? 'updated_at' THEN (p_updates->>'updated_at')::timestamptz
      ELSE updated_at
    END
  WHERE id = p_id
  RETURNING * INTO updated_row;

  IF (p_updates ? 'status') AND updated_row.status IS DISTINCT FROM old_status THEN
    INSERT INTO public.logs (user_id, action, details)
    VALUES (
      p_user_id,
      'ticket.status_changed',
      jsonb_build_object(
        'ticket_id', p_id,
        'from', old_status,
        'to', updated_row.status
      )
    );
  END IF;

  IF (p_updates ? 'assigned_to') AND updated_row.assigned_to IS DISTINCT FROM old_assigned_to THEN
    INSERT INTO public.logs (user_id, action, details)
    VALUES (
      p_user_id,
      CASE WHEN updated_row.assigned_to IS NULL THEN 'ticket.unassigned' ELSE 'ticket.assigned' END,
      jsonb_build_object(
        'ticket_id', p_id,
        'from', old_assigned_to,
        'to', updated_row.assigned_to
      )
    );
  END IF;

  IF (p_updates ? 'due_at') AND updated_row.due_at IS DISTINCT FROM old_due_at THEN
    INSERT INTO public.logs (user_id, action, details)
    VALUES (
      p_user_id,
      'ticket.due_date_changed',
      jsonb_build_object(
        'ticket_id', p_id,
        'from', old_due_at,
        'to', updated_row.due_at
      )
    );
  END IF;

  RETURN updated_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_ticket_with_logs(uuid, jsonb, uuid) TO authenticated;
