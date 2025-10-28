import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Tables, TablesInsert, Enums } from '@/types/supabase';
import { useEffect } from 'react';

// --- Fetch Hooks ---

export const fetchTickets = async (): Promise<Tables<'tickets'>[]> => {
  const { data, error } = await supabase.from('tickets').select('*');
  if (error) throw new Error(error.message);
  return data || [];
};

export const useTickets = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('public:tickets')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['tickets'] });
          queryClient.invalidateQueries({ queryKey: ['ticketsSummary'] });
          queryClient.invalidateQueries({ queryKey: ['ticketsPerMonth'] });
          queryClient.invalidateQueries({ queryKey: ['issueCategories'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery<Tables<'tickets'>[], Error>({
    queryKey: ['tickets'],
    queryFn: fetchTickets,
  });
};

export const fetchTicketById = async (id: string): Promise<Tables<'tickets'>> => {
  const { data, error } = await supabase.from('tickets').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data;
};

export const useTicketById = (id: string) => {
  return useQuery<Tables<'tickets'>, Error>({
    queryKey: ['ticket', id],
    queryFn: () => fetchTicketById(id),
    enabled: !!id,
  });
};

export const fetchTicketsSummary = async () => {
  const { data: openTickets, error: openError } = await supabase
    .from('tickets')
    .select('id', { count: 'exact' })
    .eq('status', 'Open');
  if (openError) throw new Error(openError.message);

  const { data: inProgressTickets, error: inProgressError } = await supabase
    .from('tickets')
    .select('id', { count: 'exact' })
    .eq('status', 'In Progress');
  if (inProgressError) throw new Error(inProgressError.message);

  const { data: closedTickets, error: closedError } = await supabase
    .from('tickets')
    .select('id', { count: 'exact' })
    .eq('status', 'Closed');
  if (closedError) throw new Error(closedError.message);

  const { data: totalTickets, error: totalError } = await supabase
    .from('tickets')
    .select('id', { count: 'exact' });
  if (totalError) throw new Error(totalError.message);

  return {
    open: openTickets?.length || 0,
    inProgress: inProgressTickets?.length || 0,
    closed: closedTickets?.length || 0,
    total: totalTickets?.length || 0,
  };
};

export const useTicketsSummary = () => {
  return useQuery({
    queryKey: ['ticketsSummary'],
    queryFn: fetchTicketsSummary,
  });
};

export const fetchTicketsPerMonth = async () => {
  const { data, error } = await supabase.rpc('get_tickets_created_per_month');
  if (error) throw new Error(error.message);

  // Map month numbers to names
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return data.map((item: { month: number; count: number }) => ({
    month: monthNames[item.month - 1],
    tickets: item.count,
  }));
};

export const useTicketsPerMonth = () => {
  return useQuery({
    queryKey: ['ticketsPerMonth'],
    queryFn: fetchTicketsPerMonth,
  });
};

export const fetchIssueCategories = async () => {
  const { data, error } = await supabase.rpc('get_issue_categories_distribution');
  if (error) throw new Error(error.message);

  const colors = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(var(--muted))',
  ];

  return data.map((item: { category: string; count: number }, index: number) => ({
    name: item.category,
    value: item.count,
    color: colors[index % colors.length],
  }));
};

export const useIssueCategories = () => {
  return useQuery({
    queryKey: ['issueCategories'],
    queryFn: fetchIssueCategories,
  });
};

export const fetchTicketComments = async (ticketId: string): Promise<Tables<'ticket_comments'>[]> => {
  const { data, error } = await supabase
    .from('ticket_comments')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
};

export const useTicketComments = (ticketId: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`public:ticket_comments:ticket_id=eq.${ticketId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ticket_comments', filter: `ticket_id=eq.${ticketId}` },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['ticketComments', ticketId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, ticketId]);

  return useQuery<Tables<'ticket_comments'>[], Error>({
    queryKey: ['ticketComments', ticketId],
    queryFn: () => fetchTicketComments(ticketId),
    enabled: !!ticketId,
  });
};

export const fetchTicketHistory = async (ticketId: string): Promise<Tables<'ticket_history'>[]> => {
  const { data, error } = await supabase
    .from('ticket_history')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
};

export const useTicketHistory = (ticketId: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`public:ticket_history:ticket_id=eq.${ticketId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ticket_history', filter: `ticket_id=eq.${ticketId}` },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['ticketHistory', ticketId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, ticketId]);

  return useQuery<Tables<'ticket_history'>[], Error>({
    queryKey: ['ticketHistory', ticketId],
    queryFn: () => fetchTicketHistory(ticketId),
    enabled: !!ticketId,
  });
};

// --- Mutation Hooks ---

export const useCreateTicket = () => {
  const queryClient = useQueryClient();
  return useMutation<Tables<'tickets'>, Error, TablesInsert<'tickets'>>({
    mutationFn: async (newTicket) => {
      const { data, error } = await supabase.from('tickets').insert(newTicket).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticketsSummary'] });
      queryClient.invalidateQueries({ queryKey: ['ticketsPerMonth'] });
      queryClient.invalidateQueries({ queryKey: ['issueCategories'] });
    },
  });
};

export const useUpdateTicket = () => {
  const queryClient = useQueryClient();
  return useMutation<Tables<'tickets'>, Error, Partial<Tables<'tickets'>> & { id: string }>({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase.from('tickets').update(updates).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['ticketsSummary'] });
      queryClient.invalidateQueries({ queryKey: ['ticketsPerMonth'] });
      queryClient.invalidateQueries({ queryKey: ['issueCategories'] });
    },
  });
};

export const useAddTicketComment = () => {
  const queryClient = useQueryClient();
  return useMutation<Tables<'ticket_comments'>, Error, TablesInsert<'ticket_comments'>>({
    mutationFn: async (newComment) => {
      const { data, error } = await supabase.from('ticket_comments').insert(newComment).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ticketComments', data.ticket_id] });
    },
  });
};

export const useAddTicketHistory = () => {
  const queryClient = useQueryClient();
  return useMutation<Tables<'ticket_history'>, Error, TablesInsert<'ticket_history'>>({
    mutationFn: async (newHistory) => {
      const { data, error } = await supabase.from('ticket_history').insert(newHistory).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ticketHistory', data.ticket_id] });
    },
  });
};
