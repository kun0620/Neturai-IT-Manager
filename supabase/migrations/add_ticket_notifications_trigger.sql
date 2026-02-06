/*
  # Add ticket notifications trigger

  - Inserts notifications on ticket create and status/priority change
  - Targets both assignee and creator (if present)
*/

CREATE OR REPLACE FUNCTION public.notify_ticket_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  recipients uuid[];
  recipient uuid;
  notification_type text;
  notification_title text;
  notification_body text;
BEGIN
  recipients := ARRAY[]::uuid[];

  IF NEW.assigned_to IS NOT NULL THEN
    recipients := array_append(recipients, NEW.assigned_to);
  END IF;

  IF NEW.created_by IS NOT NULL THEN
    recipients := array_append(recipients, NEW.created_by);
  END IF;

  -- De-duplicate recipients
  SELECT ARRAY(
    SELECT DISTINCT r FROM unnest(recipients) AS r
  ) INTO recipients;

  IF TG_OP = 'INSERT' THEN
    notification_type := 'new_ticket';
    notification_title := COALESCE(NEW.title, 'New ticket');
    notification_body := COALESCE(NEW.description, NULL);

    FOREACH recipient IN ARRAY recipients LOOP
      INSERT INTO public.notifications (
        user_id,
        ticket_id,
        type,
        title,
        body,
        is_read
      ) VALUES (
        recipient,
        NEW.id,
        notification_type,
        notification_title,
        notification_body,
        false
      );
    END LOOP;

    RETURN NEW;
  END IF;

  -- UPDATE: status change
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    notification_type := 'status_change';
    notification_title := 'Ticket status changed';
    notification_body := COALESCE(NEW.title, 'Ticket');

    FOREACH recipient IN ARRAY recipients LOOP
      INSERT INTO public.notifications (
        user_id,
        ticket_id,
        type,
        title,
        body,
        is_read
      ) VALUES (
        recipient,
        NEW.id,
        notification_type,
        notification_title,
        notification_body,
        false
      );
    END LOOP;
  END IF;

  -- UPDATE: priority change
  IF NEW.priority IS DISTINCT FROM OLD.priority THEN
    notification_type := 'priority_change';
    notification_title := 'Ticket priority changed';
    notification_body := COALESCE(NEW.title, 'Ticket');

    FOREACH recipient IN ARRAY recipients LOOP
      INSERT INTO public.notifications (
        user_id,
        ticket_id,
        type,
        title,
        body,
        is_read
      ) VALUES (
        recipient,
        NEW.id,
        notification_type,
        notification_title,
        notification_body,
        false
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ticket_notifications_trigger ON public.tickets;

CREATE TRIGGER ticket_notifications_trigger
AFTER INSERT OR UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.notify_ticket_changes();
