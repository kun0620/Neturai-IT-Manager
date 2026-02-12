/*
  # Extend dashboard metrics RPC with recent tickets

  Keep dashboard data in one round-trip by returning recent tickets in the same payload.
*/

DROP FUNCTION IF EXISTS public.get_dashboard_metrics();
DROP FUNCTION IF EXISTS public.get_dashboard_metrics(uuid, boolean);

CREATE FUNCTION public.get_dashboard_metrics(
  p_user_id uuid DEFAULT NULL,
  p_only_my boolean DEFAULT false
)
RETURNS TABLE (
  total_tickets bigint,
  total_assets bigint,
  open_tickets_count bigint,
  in_progress_tickets_count bigint,
  closed_tickets_count bigint,
  today_tickets_count bigint,
  overdue_tickets_count bigint,
  avg_resolution_hours numeric,
  open_trend_delta bigint,
  in_progress_trend_delta bigint,
  closed_trend_delta bigint,
  today_trend_delta bigint,
  overdue_trend_delta bigint,
  recent_tickets jsonb
)
LANGUAGE sql
STABLE
AS $$
  WITH bounds AS (
    SELECT
      date_trunc('day', now()) AS start_today,
      date_trunc('day', now()) - interval '1 day' AS start_yesterday,
      now() AS now_ts
  ),
  ticket_scope AS (
    SELECT t.*
    FROM public.tickets t
    WHERE
      NOT p_only_my
      OR (
        p_user_id IS NOT NULL
        AND (t.assigned_to = p_user_id OR t.created_by = p_user_id)
      )
  ),
  closed_events AS (
    SELECT
      l.details->>'ticket_id' AS ticket_id,
      min(l.created_at) AS closed_at
    FROM public.logs l
    JOIN ticket_scope ts
      ON ts.id::text = l.details->>'ticket_id'
    WHERE l.action = 'ticket.status_changed'
      AND l.details->>'to' = 'closed'
      AND l.details->>'ticket_id' IS NOT NULL
    GROUP BY l.details->>'ticket_id'
  ),
  status_events AS (
    SELECT
      l.details->>'ticket_id' AS ticket_id,
      l.created_at AS changed_at,
      l.details->>'to' AS to_status
    FROM public.logs l
    JOIN ticket_scope ts
      ON ts.id::text = l.details->>'ticket_id'
    WHERE l.action = 'ticket.status_changed'
      AND l.details->>'ticket_id' IS NOT NULL
      AND l.details->>'to' IN ('open', 'in_progress', 'closed')
  ),
  created_events AS (
    SELECT
      ts.id::text AS ticket_id,
      ts.created_at AS changed_at,
      lower(ts.status::text) AS to_status
    FROM ticket_scope ts
    WHERE ts.created_at IS NOT NULL
      AND ts.status IN ('open', 'in_progress', 'closed')
  ),
  lifecycle_events AS (
    SELECT ticket_id, changed_at, to_status FROM status_events
    UNION ALL
    SELECT ticket_id, changed_at, to_status FROM created_events
  ),
  resolution AS (
    SELECT
      avg(extract(epoch FROM (ce.closed_at - t.created_at)) / 3600.0) AS avg_hours
    FROM closed_events ce
    JOIN ticket_scope t
      ON t.id::text = ce.ticket_id
    WHERE t.created_at IS NOT NULL
      AND ce.closed_at >= t.created_at
  ),
  recent AS (
    SELECT
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', t.id,
            'title', t.title,
            'category_id', t.category_id,
            'priority', t.priority,
            'status', t.status,
            'created_at', t.created_at
          )
          ORDER BY t.created_at DESC
        ),
        '[]'::jsonb
      ) AS items
    FROM (
      SELECT id, title, category_id, priority, status, created_at
      FROM ticket_scope
      ORDER BY created_at DESC
      LIMIT 20
    ) t
  )
  SELECT
    (SELECT count(*) FROM ticket_scope) AS total_tickets,
    (SELECT count(*) FROM public.assets) AS total_assets,
    (SELECT count(*) FROM ticket_scope WHERE status = 'open') AS open_tickets_count,
    (SELECT count(*) FROM ticket_scope WHERE status = 'in_progress') AS in_progress_tickets_count,
    (SELECT count(*) FROM ticket_scope WHERE status = 'closed') AS closed_tickets_count,
    (
      SELECT count(*)
      FROM ticket_scope t, bounds b
      WHERE t.created_at >= b.start_today
    ) AS today_tickets_count,
    (
      SELECT count(*)
      FROM ticket_scope t, bounds b
      WHERE t.due_at < b.now_ts
        AND t.status <> 'closed'
    ) AS overdue_tickets_count,
    (SELECT round(avg_hours::numeric, 2) FROM resolution) AS avg_resolution_hours,
    (
      SELECT
        count(*) FILTER (
          WHERE le.to_status = 'open'
            AND le.changed_at >= b.start_today
            AND le.changed_at < b.now_ts
        )
        - count(*) FILTER (
            WHERE le.to_status = 'open'
              AND le.changed_at >= b.start_yesterday
              AND le.changed_at < b.start_today
          )
      FROM lifecycle_events le, bounds b
    ) AS open_trend_delta,
    (
      SELECT
        count(*) FILTER (
          WHERE le.to_status = 'in_progress'
            AND le.changed_at >= b.start_today
            AND le.changed_at < b.now_ts
        )
        - count(*) FILTER (
            WHERE le.to_status = 'in_progress'
              AND le.changed_at >= b.start_yesterday
              AND le.changed_at < b.start_today
          )
      FROM lifecycle_events le, bounds b
    ) AS in_progress_trend_delta,
    (
      SELECT
        count(*) FILTER (
          WHERE le.to_status = 'closed'
            AND le.changed_at >= b.start_today
            AND le.changed_at < b.now_ts
        )
        - count(*) FILTER (
            WHERE le.to_status = 'closed'
              AND le.changed_at >= b.start_yesterday
              AND le.changed_at < b.start_today
          )
      FROM lifecycle_events le, bounds b
    ) AS closed_trend_delta,
    (
      SELECT
        count(*) FILTER (WHERE t.created_at >= b.start_today)
        - count(*) FILTER (
            WHERE t.created_at >= b.start_yesterday
              AND t.created_at < b.start_today
          )
      FROM ticket_scope t, bounds b
    ) AS today_trend_delta,
    (
      SELECT
        count(*) FILTER (
          WHERE t.due_at >= b.start_today
            AND t.due_at < b.now_ts
            AND t.status <> 'closed'
        )
        - count(*) FILTER (
            WHERE t.due_at >= b.start_yesterday
              AND t.due_at < b.start_today
              AND t.status <> 'closed'
          )
      FROM ticket_scope t, bounds b
    ) AS overdue_trend_delta,
    (SELECT items FROM recent) AS recent_tickets
  ;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics(uuid, boolean) TO service_role;
