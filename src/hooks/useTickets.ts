import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';
import type { TablesUpdate } from '@/types/database.types';

/* ================= Types ================= */

type Ticket = Database['public']['Tables']['tickets']['Row'];
type TicketCategory = Database['public']['Tables']['ticket_categories']['Row'];
type TicketComment = Database['public']['Tables']['ticket_comments']['Row'];

type RecentTicket = Pick<
  Ticket,
  'id' | 'title' | 'category_id' | 'priority' | 'status' | 'created_at'
>;

type LogRow = Database['public']['Tables']['logs']['Row'];
type ProfileLite = {
  id: string;
  name: string | null;
  email: string | null;
};

const useLogAuthors = (logs?: LogRow[]) => {
  const userIds = Array.from(
    new Set(logs?.map(l => l.user_id).filter(Boolean) as string[])
  );

  return useQuery<Record<string, ProfileLite>>({
    queryKey: ['logAuthors', userIds.join(',')],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const map: Record<string, ProfileLite> = {};

      await Promise.all(
        userIds.map(async (id) => {
          const { data } = await supabase
            .from('profiles')
            .select('id, name, email')
            .eq('id', id)
            .maybeSingle();

          if (data) map[id] = data;
        })
      );

      return map;
    },
  });
};

/* ================= Dashboard ================= */

const useDashboardSummary = () =>
  useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: async () => {
      const { count: totalTickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true });

      if (ticketsError) throw ticketsError;

      const { count: totalAssets, error: assetsError } = await supabase
        .from('assets')
        .select('*', { count: 'exact', head: true });

      if (assetsError) throw assetsError;

      return {
        totalTickets: totalTickets ?? 0,
        totalAssets: totalAssets ?? 0,
      };
    },
  });

const useOpenTicketsCount = () =>
  useQuery({
    queryKey: ['openTicketsCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open');

      if (error) throw error;
      return count ?? 0;
    },
  });

const useInProgressTicketsCount = () =>
  useQuery({
    queryKey: ['inProgressTicketsCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'in_progress');

      if (error) throw error;
      return count ?? 0;
    },
  });

const useClosedTicketsCount = () =>
  useQuery({
    queryKey: ['closedTicketsCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'closed');

      if (error) throw error;
      return count ?? 0;
    },
  });

/* ================= Tickets ================= */

const useRecentTickets = () =>
  useQuery<RecentTicket[]>({
    queryKey: ['recentTickets', 5],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('id, title, category_id, priority, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data ?? [];
    },
  });

const useAllTickets = () =>
  useQuery<Ticket[]>({
    queryKey: ['allTickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });

const useTicketById = (ticketId?: string) =>
  useQuery<Ticket>({
    queryKey: ['ticket', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId!)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!ticketId, // ⭐ ป้องกัน hook order error
  });

const useTicketCategories = () =>
  useQuery<TicketCategory[]>({
    queryKey: ['ticketCategories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      return data ?? [];
    },
  });

/* ================= Create Ticket ================= */

interface CreateTicketPayload {
  user_id: string;
  subject: string;
  description: string;
  category_id: string;
  priority: string;
  status: 'open' | 'in_progress' | 'closed';
}

const useCreateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation<Ticket, Error, CreateTicketPayload>({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('tickets')
        .insert({
          created_by: payload.user_id,
          title: payload.subject,
          description: payload.description,
          category_id: payload.category_id,
          priority: payload.priority,
          status: payload.status,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('logs').insert({
        action: 'ticket.created',
        user_id: payload.user_id,
        details: {
          ticket_id: data.id,
          title: data.title,
          priority: data.priority,
        },
      });

      return data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTickets'] });
      queryClient.invalidateQueries({ queryKey: ['recentTickets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });
};

/* ================= Update Ticket ================= */

interface UpdateTicketPayload {
  id: string;
  updates: TablesUpdate<'tickets'>;
  userId: string;
}

const useUpdateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation<Ticket, Error, UpdateTicketPayload>({
    mutationFn: async ({ id, updates, userId }) => {
      const { data: oldTicket, error } = await supabase
        .from('tickets')
        .select('status, assigned_to, due_at')
        .eq('id', id)
        .single();

      if (error) throw error;

      const { data: updatedTicket, error: updateError } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      const normalize = (v?: string | null) => v ?? null;
      const logs: any[] = [];

      if (updates.status && updates.status !== oldTicket.status) {
        logs.push({
          action: 'ticket.status_changed',
          user_id: userId,
          details: {
            ticket_id: id,
            from: normalize(oldTicket.status),
            to: normalize(updates.status),
          },
        });
      }

      if ('due_at' in updates && updates.due_at !== oldTicket.due_at) {
        logs.push({
          action: 'ticket.due_date_changed',
          user_id: userId,
          details: {
            ticket_id: id,
            from: normalize(oldTicket.due_at),
            to: normalize(updates.due_at),
          },
        });
      }

      if (logs.length > 0) {
        await supabase.from('logs').insert(logs);
      }

      return updatedTicket;
    },

    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['ticket', v.id] });
      queryClient.invalidateQueries({ queryKey: ['allTickets'] });
    },
  });
};

/* ================= Comments ================= */

interface AddTicketCommentPayload {
  ticket_id: string;
  user_id: string;
  comment_text: string;
}

const useTicketComments = (ticketId?: string) =>
  useQuery<TicketComment[]>({
    queryKey: ['ticketComments', ticketId],
    queryFn: async () => {
      if (!ticketId) return [];

      const { data, error } = await supabase
        .from('ticket_comments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!ticketId, // ⭐ แก้ hook order + 400
  });

const useAddTicketComment = () => {
  const queryClient = useQueryClient();

  return useMutation<TicketComment, Error, AddTicketCommentPayload>({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('ticket_comments')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['ticketComments', variables.ticket_id],
      });
    },
  });
};

/* ---------------- Ticket Timeline ---------------- */

const useTicketTimeline = (ticketId?: string) => {
  return useQuery({
    queryKey: ['ticketTimeline', ticketId],
    enabled: !!ticketId, // ⭐ สำคัญ
    queryFn: async () => {
      if (!ticketId) return [];

      const { data, error } = await supabase
        .from('logs')
        .select('*')
        .eq('details->>ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
};

const useTodayTicketsCount = () =>
  useQuery({
    queryKey: ['todayTicketsCount'],
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', start.toISOString());

      if (error) throw error;
      return count ?? 0;
    },
  });

const useOverdueTicketsCount = () =>
  useQuery({
    queryKey: ['overdueTicketsCount'],
    queryFn: async () => {
      const now = new Date().toISOString();

      const { count, error } = await supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .lt('due_at', now)
        .neq('status', 'closed');

      if (error) throw error;
      return count ?? 0;
    },
  });

const useAvgResolutionTime = () =>
  useQuery({
    queryKey: ['avgResolutionTime'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('logs')
        .select('details, created_at')
        .eq('action', 'ticket.status_changed')
        .eq('details->>to', 'closed');

      if (error) throw error;
      if (!data || data.length === 0) return null;

      // logic คำนวณต่อ (คุณทำไว้แล้วก่อนหน้านี้ ถือว่าโอเค)
      return null;
    },
  });




/* ================= Export ================= */

export const useTickets = {
  useDashboardSummary,
  useOpenTicketsCount,
  useInProgressTicketsCount,
  useClosedTicketsCount,

  useRecentTickets,
  useAllTickets,
  useTicketById,
  useTicketCategories,

  useCreateTicket,
  useUpdateTicket,

  useTicketComments,
  useAddTicketComment,
  useTicketTimeline,

  useTodayTicketsCount,
  useOverdueTicketsCount,
  useAvgResolutionTime,
  useLogAuthors,
};
