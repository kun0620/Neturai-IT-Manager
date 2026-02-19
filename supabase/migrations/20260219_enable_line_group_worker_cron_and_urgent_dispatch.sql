/*
  # Enable LINE worker cron (every minute) + urgent dispatch

  - Adds settings for worker endpoint/secret and batch size
  - Adds DB helper to call Edge Function worker via pg_net
  - Schedules cron job to run every minute
  - Updates enqueue_line_group_notification to trigger immediate worker call
    for high-urgency events (new_critical, sla_breach)
*/

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

INSERT INTO public.settings (key, value)
VALUES
  ('line_worker_endpoint', 'https://zufcpzxrxztncpagepkx.supabase.co/functions/v1/line-group-notify-worker'),
  ('line_worker_secret', ''),
  ('line_worker_batch_size', '20')
ON CONFLICT (key) DO NOTHING;

DROP FUNCTION IF EXISTS public.run_line_group_notify_worker();

CREATE FUNCTION public.run_line_group_notify_worker()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled boolean := false;
  v_endpoint text;
  v_secret text;
  v_batch_size integer := 20;
  v_request_id bigint;
BEGIN
  SELECT coalesce((SELECT value FROM public.settings WHERE key = 'line_group_notify_enabled' LIMIT 1), 'false') = 'true'
  INTO v_enabled;

  IF NOT v_enabled THEN
    RETURN NULL;
  END IF;

  SELECT nullif(trim(value), '')
  INTO v_endpoint
  FROM public.settings
  WHERE key = 'line_worker_endpoint'
  LIMIT 1;

  SELECT nullif(trim(value), '')
  INTO v_secret
  FROM public.settings
  WHERE key = 'line_worker_secret'
  LIMIT 1;

  SELECT value
  INTO v_batch_size
  FROM public.settings
  WHERE key = 'line_worker_batch_size'
  LIMIT 1;

  IF coalesce(v_endpoint, '') = '' OR coalesce(v_secret, '') = '' THEN
    RETURN NULL;
  END IF;

  IF v_batch_size IS NULL OR v_batch_size < 1 OR v_batch_size > 100 THEN
    v_batch_size := 20;
  END IF;

  SELECT net.http_post(
    url := v_endpoint,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-worker-secret', v_secret
    ),
    body := jsonb_build_object('batchSize', v_batch_size),
    timeout_milliseconds := 10000
  )
  INTO v_request_id;

  RETURN v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_line_group_notify_worker() TO service_role;

DO $job$
DECLARE
  v_job_id bigint;
BEGIN
  SELECT jobid
  INTO v_job_id
  FROM cron.job
  WHERE jobname = 'line_group_notify_worker_every_minute'
  LIMIT 1;

  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;

  PERFORM cron.schedule(
    'line_group_notify_worker_every_minute',
    '* * * * *',
    'SELECT public.run_line_group_notify_worker();'
  );
END $job$;

CREATE OR REPLACE FUNCTION public.enqueue_line_group_notification(
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

  IF v_job_id IS NOT NULL
    AND lower(coalesce(p_event_type, '')) IN ('new_critical', 'sla_breach') THEN
    PERFORM public.run_line_group_notify_worker();
  END IF;

  RETURN v_job_id;
END;
$$;
