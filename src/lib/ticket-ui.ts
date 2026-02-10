import type { BadgeProps } from '@/components/ui/badge';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

export type TicketStatusUiKey = 'open' | 'in_progress' | 'closed';
export type TicketPriorityUiKey = 'low' | 'medium' | 'high' | 'critical';

export const TICKET_STATUS_UI: Record<
  TicketStatusUiKey,
  {
    label: string;
    variant: BadgeVariant;
    textClass: string;
    badgeClass?: string;
  }
> = {
  open: {
    label: 'Open',
    variant: 'info',
    textClass: 'text-info',
  },
  in_progress: {
    label: 'In Progress',
    variant: 'warning',
    textClass: 'text-warning',
  },
  closed: {
    label: 'Closed',
    variant: 'success',
    textClass: 'text-success',
  },
};

export const TICKET_PRIORITY_UI: Record<
  TicketPriorityUiKey,
  {
    label: string;
    variant: BadgeVariant;
  }
> = {
  low: { label: 'Low', variant: 'outline' },
  medium: { label: 'Medium', variant: 'info' },
  high: { label: 'High', variant: 'warning' },
  critical: { label: 'Critical', variant: 'destructive' },
};

export function normalizeTicketStatus(
  value: string | null | undefined
): TicketStatusUiKey {
  const key = value?.toLowerCase().replace(/\s+/g, '_');

  if (key === 'in_progress') return 'in_progress';
  if (key === 'closed') return 'closed';
  return 'open';
}

export function normalizeTicketPriority(
  value: string | null | undefined
): TicketPriorityUiKey {
  const key = value?.toLowerCase().trim();

  if (key === 'critical') return 'critical';
  if (key === 'high') return 'high';
  if (key === 'medium') return 'medium';
  return 'low';
}

export function getTicketStatusUi(value: string | null | undefined) {
  return TICKET_STATUS_UI[normalizeTicketStatus(value)];
}

export function getTicketPriorityUi(value: string | null | undefined) {
  return TICKET_PRIORITY_UI[normalizeTicketPriority(value)];
}
