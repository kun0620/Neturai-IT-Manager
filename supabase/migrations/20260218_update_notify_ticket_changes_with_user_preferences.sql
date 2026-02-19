/*
  # Respect user notification preferences in ticket trigger
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

  SELECT ARRAY(
    SELECT DISTINCT r FROM unnest(recipients) AS r
  ) INTO recipients;

  IF TG_OP = 'INSERT' THEN
    notification_type := 'new_ticket';
    notification_title := COALESCE(NEW.title, 'New ticket');
    notification_body := COALESCE(NEW.description, NULL);

    FOREACH recipient IN ARRAY recipients LOOP
      IF public.notification_enabled_for_user(recipient, notification_type) THEN
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
      END IF;
    END LOOP;

    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    notification_type := 'status_change';
    notification_title := 'Ticket status changed';
    notification_body := COALESCE(NEW.title, 'Ticket');

    FOREACH recipient IN ARRAY recipients LOOP
      IF public.notification_enabled_for_user(recipient, notification_type) THEN
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
      END IF;
    END LOOP;
  END IF;

  IF NEW.priority IS DISTINCT FROM OLD.priority THEN
    notification_type := 'priority_change';
    notification_title := 'Ticket priority changed';
    notification_body := COALESCE(NEW.title, 'Ticket');

    FOREACH recipient IN ARRAY recipients LOOP
      IF public.notification_enabled_for_user(recipient, notification_type) THEN
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
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

