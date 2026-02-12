/*
  # Create dashboard metrics RPC

  This function returns the dashboard snapshot in a single round-trip:
  - totals
  - status counts
  - overdue count
  - average resolution time
  - day-over-day trend deltas
*/

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics()
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
  overdue_trend_delta bigint
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
  closed_events AS (
    SELECT
      details->>'ticket_id' AS ticket_id,
      min(created_at) AS closed_at
    FROM public.logs
    WHERE action = 'ticket.status_changed'
      AND details->>'to' = 'closed'
      AND details->>'ticket_id' IS NOT NULL
    GROUP BY details->>'ticket_id'
  ),
  resolution AS (
    SELECT
      avg(extract(epoch FROM (ce.closed_at - t.created_at)) / 3600.0) AS avg_hours
    FROM closed_events ce
    JOIN public.tickets t
      ON t.id::text = ce.ticket_id
    WHERE t.created_at IS NOT NULL
      AND ce.closed_at >= t.created_at
  )
  SELECT
    (SELECT count(*) FROM public.tickets) AS total_tickets,
    (SELECT count(*) FROM public.assets) AS total_assets,
    (SELECT count(*) FROM public.tickets WHERE status = 'open') AS open_tickets_count,
    (SELECT count(*) FROM public.tickets WHERE status = 'in_progress') AS in_progress_tickets_count,
    (SELECT count(*) FROM public.tickets WHERE status = 'closed') AS closed_tickets_count,
    (
      SELECT count(*)
      FROM public.tickets t, bounds b
      WHERE t.created_at >= b.start_today
    ) AS today_tickets_count,
    (
      SELECT count(*)
      FROM public.tickets t, bounds b
      WHERE t.due_at < b.now_ts
        AND t.status <> 'closed'
    ) AS overdue_tickets_count,
    (SELECT round(avg_hours::numeric, 2) FROM resolution) AS avg_resolution_hours,
    (
      SELECT
        count(*) FILTER (WHERE t.status = 'open' AND t.created_at >= b.start_today)
        - count(*) FILTER (
            WHERE t.status = 'open'
              AND t.created_at >= b.start_yesterday
              AND t.created_at < b.start_today
          )
      FROM public.tickets t, bounds b
    ) AS open_trend_delta,
    (
      SELECT
        count(*) FILTER (WHERE t.status = 'in_progress' AND t.created_at >= b.start_today)
        - count(*) FILTER (
            WHERE t.status = 'in_progress'
              AND t.created_at >= b.start_yesterday
              AND t.created_at < b.start_today
          )
      FROM public.tickets t, bounds b
    ) AS in_progress_trend_delta,
    (
      SELECT
        count(*) FILTER (WHERE t.status = 'closed' AND t.created_at >= b.start_today)
        - count(*) FILTER (
            WHERE t.status = 'closed'
              AND t.created_at >= b.start_yesterday
              AND t.created_at < b.start_today
          )
      FROM public.tickets t, bounds b
    ) AS closed_trend_delta,
    (
      SELECT
        count(*) FILTER (WHERE t.created_at >= b.start_today)
        - count(*) FILTER (
            WHERE t.created_at >= b.start_yesterday
              AND t.created_at < b.start_today
          )
      FROM public.tickets t, bounds b
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
      FROM public.tickets t, bounds b
    ) AS overdue_trend_delta
  ;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics() TO service_role;
