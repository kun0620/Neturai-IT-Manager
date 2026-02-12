/*
  # Add indexes for dashboard metrics RPC

  Optimize public.get_dashboard_metrics(uuid, boolean):
  - ticket scope filters (assigned_to / created_by)
  - counts by status / created_at / due_at
  - recent ticket ordering by created_at
  - status change log lookups by ticket_id/to/action/created_at
*/

-- Tickets: scope and aggregate filters
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON public.tickets (assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON public.tickets (created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets (status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at_desc ON public.tickets (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_due_at_open
  ON public.tickets (due_at)
  WHERE status <> 'closed';

-- Logs: status change timeline and closed event scans
CREATE INDEX IF NOT EXISTS idx_logs_status_changed_ticket_to_created_at
  ON public.logs ((details->>'ticket_id'), (details->>'to'), created_at)
  WHERE action = 'ticket.status_changed';

CREATE INDEX IF NOT EXISTS idx_logs_action_created_at
  ON public.logs (action, created_at);
