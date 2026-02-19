export type TicketSlaInput = {
  status: string | null;
  priority: string | null;
  created_at: string | null;
  due_at: string | null;
};

export type SlaPolicyInput = {
  priority: string | null;
  resolution_time_hours: number | null;
};

const normalizePriority = (value: string | null | undefined) =>
  (value ?? '').trim().toLowerCase();

export const buildSlaResolutionHoursMap = (
  policies: SlaPolicyInput[]
): Record<string, number> =>
  policies.reduce<Record<string, number>>((acc, policy) => {
    const key = normalizePriority(policy.priority);
    if (!key) return acc;
    const hours = Number(policy.resolution_time_hours ?? 0);
    if (!Number.isFinite(hours) || hours <= 0) return acc;
    acc[key] = hours;
    return acc;
  }, {});

export const isTicketSlaBreached = (
  ticket: TicketSlaInput,
  slaResolutionHoursMap: Record<string, number>,
  nowMs = Date.now()
) => {
  if (ticket.status === 'closed') return false;

  // Prefer due_at if present (single source for live breach state).
  if (ticket.due_at) {
    const dueMs = new Date(ticket.due_at).getTime();
    if (Number.isFinite(dueMs)) return dueMs < nowMs;
  }

  if (!ticket.created_at || !ticket.priority) return false;
  const createdMs = new Date(ticket.created_at).getTime();
  if (!Number.isFinite(createdMs)) return false;

  const hours = slaResolutionHoursMap[normalizePriority(ticket.priority)];
  if (!hours) return false;

  return nowMs > createdMs + hours * 60 * 60 * 1000;
};
