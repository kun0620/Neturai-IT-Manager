/*
  # Cleanup duplicate ticket notification triggers

  Keep one canonical notification trigger on public.tickets:
  - ticket_notifications_trigger -> public.notify_ticket_changes()

  Remove legacy duplicate trigger that can cause double notifications.
*/

-- Remove legacy trigger (if present) that overlaps INSERT notifications.
DROP TRIGGER IF EXISTS trg_ticket_created ON public.tickets;

-- Recreate canonical trigger to guarantee a single source of ticket notifications.
DROP TRIGGER IF EXISTS ticket_notifications_trigger ON public.tickets;
CREATE TRIGGER ticket_notifications_trigger
AFTER INSERT OR UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.notify_ticket_changes();

-- Optional legacy helper function cleanup.
DROP FUNCTION IF EXISTS public.notify_ticket_created();
