/*
  # Add LINE group notification queue (phase 1)

  - Adds settings defaults for LINE group alerting
  - Adds notification_jobs queue table
  - Adds enqueue helper with 5-minute dedupe window
  - Adds trigger for high-signal ticket events
*/

INSERT INTO public.settings (key, value)
VALUES
  ('line_group_notify_enabled', 'false'),
  ('line_group_notify_events', 'new_high,new_critical,assigned,reopened,sla_breach'),
  ('line_group_notify_min_priority', 'high'),
  ('line_group_notify_rate_limit_per_10m', '20'),
  ('line_group_notify_quiet_hours', '22:00-07:00'),
  ('line_group_notify_digest_enabled', 'false'),
  ('line_group_notify_digest_interval_minutes', '30')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.notification_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL,
  event_type text NOT NULL,
  dedupe_key text NOT NULL,
  dedupe_bucket timestamptz NOT NULL,
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_jobs_pending
  ON public.notification_jobs (status, scheduled_at, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_jobs_channel_dedupe
  ON public.notification_jobs (channel, dedupe_key, dedupe_bucket);

ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_jobs_service_role_read" ON public.notification_jobs;
CREATE POLICY "notification_jobs_service_role_read"
ON public.notification_jobs
FOR SELECT
USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "notification_jobs_service_role_insert" ON public.notification_jobs;
CREATE POLICY "notification_jobs_service_role_insert"
ON public.notification_jobs
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "notification_jobs_service_role_update" ON public.notification_jobs;
CREATE POLICY "notification_jobs_service_role_update"
ON public.notification_jobs
FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

DROP FUNCTION IF EXISTS public.enqueue_line_group_notification(text, uuid, text, text, text, jsonb);

CREATE FUNCTION public.enqueue_line_group_notification(
  p_event_type text,
  p_ticket_id uuid,
  p_priority text DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_body text DEFAULT NULL,
  p_extra jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled boolean := false;
  v_events text := '';
  v_min_priority text := 'high';
  v_priority_rank integer := 0;
  v_min_rank integer := 2;
  v_bucket timestamptz;
  v_job_id uuid;
BEGIN
  SELECT coalesce((SELECT value FROM public.settings WHERE key = 'line_group_notify_enabled' LIMIT 1), 'false') = 'true'
  INTO v_enabled;

  IF NOT v_enabled THEN
    RETURN NULL;
  END IF;

  SELECT coalesce((SELECT value FROM public.settings WHERE key = 'line_group_notify_events' LIMIT 1), '')
  INTO v_events;

  IF position(lower(coalesce(p_event_type, '')) in lower(v_events)) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT coalesce((SELECT value FROM public.settings WHERE key = 'line_group_notify_min_priority' LIMIT 1), 'high')
  INTO v_min_priority;

  v_priority_rank :=
    CASE lower(coalesce(p_priority, ''))
      WHEN 'critical' THEN 3
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 1
      ELSE 0
    END;

  v_min_rank :=
    CASE lower(coalesce(v_min_priority, 'high'))
      WHEN 'critical' THEN 3
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 1
      ELSE 0
    END;

  IF lower(coalesce(p_event_type, '')) IN ('new_high', 'new_critical') AND v_priority_rank < v_min_rank THEN
    RETURN NULL;
  END IF;

  v_bucket :=
    date_trunc('hour', now())
    + (floor(extract(minute from now())::numeric / 5) * interval '5 minute');

  INSERT INTO public.notification_jobs (
    channel,
    event_type,
    dedupe_key,
    dedupe_bucket,
    ticket_id,
    payload
  ) VALUES (
    'line_group',
    lower(coalesce(p_event_type, '')),
    lower(coalesce(p_event_type, '')) || ':' || coalesce(p_ticket_id::text, 'none'),
    v_bucket,
    p_ticket_id,
    jsonb_build_object(
      'title', p_title,
      'body', p_body,
      'priority', p_priority
    ) || coalesce(p_extra, '{}'::jsonb)
  )
  ON CONFLICT (channel, dedupe_key, dedupe_bucket) DO NOTHING
  RETURNING id
  INTO v_job_id;

  RETURN v_job_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_line_group_notification(text, uuid, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_line_group_notification(text, uuid, text, text, text, jsonb) TO service_role;

DROP FUNCTION IF EXISTS public.notify_line_group_ticket_changes();

CREATE FUNCTION public.notify_line_group_ticket_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF lower(coalesce(NEW.priority::text, '')) = 'critical' THEN
      PERFORM public.enqueue_line_group_notification(
        'new_critical',
        NEW.id,
        NEW.priority::text,
        coalesce(NEW.title, 'New critical ticket'),
        coalesce(NEW.description, '')
      );
    ELSIF lower(coalesce(NEW.priority::text, '')) = 'high' THEN
      PERFORM public.enqueue_line_group_notification(
        'new_high',
        NEW.id,
        NEW.priority::text,
        coalesce(NEW.title, 'New high ticket'),
        coalesce(NEW.description, '')
      );
    END IF;

    IF NEW.status <> 'closed' AND NEW.due_at IS NOT NULL AND NEW.due_at < now() THEN
      PERFORM public.enqueue_line_group_notification(
        'sla_breach',
        NEW.id,
        NEW.priority::text,
        'Ticket already in SLA breach',
        coalesce(NEW.title, 'Ticket')
      );
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    PERFORM public.enqueue_line_group_notification(
      'assigned',
      NEW.id,
      NEW.priority::text,
      'Ticket assigned',
      coalesce(NEW.title, 'Ticket'),
      jsonb_build_object('assigned_to', NEW.assigned_to)
    );
  END IF;

  IF OLD.status = 'closed' AND NEW.status IN ('open', 'in_progress') THEN
    PERFORM public.enqueue_line_group_notification(
      'reopened',
      NEW.id,
      NEW.priority::text,
      'Ticket reopened',
      coalesce(NEW.title, 'Ticket')
    );
  END IF;

  IF NEW.status <> 'closed'
    AND NEW.due_at IS NOT NULL
    AND NEW.due_at < now()
    AND (
      OLD.due_at IS NULL
      OR OLD.due_at >= now()
      OR OLD.status = 'closed'
    ) THEN
    PERFORM public.enqueue_line_group_notification(
      'sla_breach',
      NEW.id,
      NEW.priority::text,
      'Ticket entered SLA breach',
      coalesce(NEW.title, 'Ticket')
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS line_group_ticket_notifications_trigger ON public.tickets;
CREATE TRIGGER line_group_ticket_notifications_trigger
AFTER INSERT OR UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.notify_line_group_ticket_changes();
