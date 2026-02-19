import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { buildSlaResolutionHoursMap, isTicketSlaBreached } from '@/lib/sla';

type TicketRow = {
  id: string;
  status: 'open' | 'in_progress' | 'closed';
  priority: 'Low' | 'Medium' | 'High' | 'Critical' | null;
  created_at: string | null;
  updated_at: string | null;
  due_at: string | null;
};

export function useReportOverview(from: string, to: string) {
  return useQuery({
    queryKey: ['report-overview', from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('id, title, status, priority, created_at, updated_at, due_at')
        .gte('created_at', from)
        .lte('created_at', to);
      const { data: slaPolicies, error: slaPoliciesError } = await supabase
        .from('sla_policies')
        .select('priority, resolution_time_hours');

      if (error) throw error;
      if (slaPoliciesError) throw slaPoliciesError;

      const tickets = (data ?? []) as TicketRow[];

      if (tickets.length === 0) {
        return {
          total: 0,
          open: 0,
          inProgress: 0,
          closed: 0,
          medianResolutionHours: null,
          overdue: 0,
          slaBreaches: 0,
        };
      }

      /* ---------- Counts ---------- */

      const total = tickets.length;
      const open = tickets.filter(t => t.status === 'open').length;
      const inProgress = tickets.filter(t => t.status === 'in_progress').length;
      const closed = tickets.filter(t => t.status === 'closed').length;

      /* ---------- Median Resolution (Closed only) ---------- */

      const closedTickets = tickets.filter(
        t => t.status === 'closed' && t.created_at && t.updated_at
      );

      let medianResolutionHours: number | null = null;

      if (closedTickets.length > 0) {
        const durations = closedTickets
          .map(t => {
            const start = new Date(t.created_at!).getTime();
            const end = new Date(t.updated_at!).getTime();
            return (end - start) / (1000 * 60 * 60);
          })
          .sort((a, b) => a - b);

        const mid = Math.floor(durations.length / 2);

        medianResolutionHours =
          durations.length % 2 !== 0
            ? durations[mid]
            : (durations[mid - 1] + durations[mid]) / 2;

        medianResolutionHours = Number(medianResolutionHours.toFixed(1));
      }

      const now = Date.now();
      const slaResolutionHoursMap = buildSlaResolutionHoursMap(slaPolicies ?? []);

      const slaBreaches = tickets.filter((t) =>
        isTicketSlaBreached(t, slaResolutionHoursMap, now)
      ).length;

      /* ---------- Overdue (due_at) ---------- */

      const overdue = tickets.filter(
        t =>
          t.due_at &&
          new Date(t.due_at).getTime() < now &&
          t.status !== 'closed'
      ).length;

      return {
        total,
        open,
        inProgress,
        closed,
        medianResolutionHours,
        overdue,
        slaBreaches,
        tickets: data,
      };
    },
  });
}
