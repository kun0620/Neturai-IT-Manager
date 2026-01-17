import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

type TicketTrendRow = {
  created_at: string;
  status: 'open' | 'in_progress' | 'closed';
};

export function useTicketsTrend(from: string, to: string) {
  return useQuery({
    queryKey: ['tickets-trend', from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('created_at, status')
        .gte('created_at', from)
        .lte('created_at', to);

      if (error) throw error;

      return (data ?? []) as TicketTrendRow[];
    },
  });
}
