import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';

type Ticket = Database['public']['Tables']['tickets']['Row'] & {
  users: { name: string } | null;
  assignee_users: { name: string } | null;
};

export const useTicketDetails = (ticketId: string) => {
  return useQuery<Ticket, Error>({
    queryKey: ['ticketDetails', ticketId],
    queryFn: async () => {
      if (!ticketId) {
        throw new Error('Ticket ID is required');
      }
      const { data, error } = await supabase
        .from('tickets')
        .select('*, users(name), assignee_users:users!tickets_assigned_to_fkey(name)')
        .eq('id', ticketId)
        .single();

      if (error) {
        throw new Error(error.message);
      }
      if (!data) {
        throw new Error('Ticket not found');
      }
      return data;
    },
    enabled: !!ticketId, // Only run the query if ticketId is available
  });
};
