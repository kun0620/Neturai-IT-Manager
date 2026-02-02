import { format } from 'date-fns';

type LogDetails = Record<string, any>;

type LogText = {
  title: string;
  description?: string;
};

function formatDate(value: string | null | undefined) {
  if (!value) return '—';

  const d = new Date(value);
  if (isNaN(d.getTime())) return value;

  return format(d, 'dd MMM yyyy HH:mm');
}


export function mapLogToText(
  action: string,
  details: LogDetails | null
): LogText {
  if (!details) {
    return { title: action };
  }

  switch (action) {
    case 'ticket.created':
      return {
        title: 'Ticket created',
        description: [
          details.title && `Title: ${details.title}`,
          details.priority && `Priority: ${details.priority}`,
        ]
          .filter(Boolean)
          .join('\n'),
      };

    case 'ticket.status_changed':
      return {
        title: 'Status changed',
        description: `from "${details.from ?? '—'}" → "${details.to ?? '—'}"`,
      };

    case 'ticket.assigned':
      return {
        title: 'Ticket assigned',
        description: `Assigned to ${details.to ?? '—'}`,
      };

    case 'ticket.unassigned':
      return {
        title: 'Ticket unassigned',
      };

    case 'ticket.due_date_changed':
      return {
        title: 'Due date changed',
        description: `from "${formatDate(details.from)}" → "${formatDate(details.to)}"`,
      };

    case 'ticket.updated':
      return {
        title: 'Ticket updated',
        description: details.source
          ? `Source: ${details.source}`
          : undefined,
      };

    default:
      return {
        title: action,
      };
  }
}
