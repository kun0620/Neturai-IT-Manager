import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useReportOverview(from: string, to: string) {
  return useQuery({
    queryKey: ['report-overview', from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('id, status')
        .gte('created_at', from)
        .lte('created_at', to);

      if (error) throw error;

      const total = data.length;
      const open = data.filter(t => t.status === 'open').length;
      const inProgress = data.filter(t => t.status === 'in_progress').length;
      const closed = data.filter(t => t.status === 'closed').length;

      return {
        total,
        open,
        inProgress,
        closed,
      };
    },
  });
}
