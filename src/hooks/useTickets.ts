import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';
import type { TablesUpdate } from '@/types/database.types';

type Ticket = Database['public']['Tables']['tickets']['Row'];
type TicketCategory = Database['public']['Tables']['ticket_categories']['Row'];
type TicketComment = Database['public']['Tables']['ticket_comments']['Row'];
type TicketHistory = Database['public']['Tables']['ticket_history']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

type RecentTicket = Pick<
  Ticket,
  'id' | 'title' | 'category_id' | 'priority' | 'status' | 'created_at'
>;

/* ---------------- Dashboard ---------------- */

const useDashboardSummary = () =>
  useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: async () => {
      const { count: totalTickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true });

      if (ticketsError) throw new Error(ticketsError.message);

      const { count: totalAssets, error: assetsError } = await supabase
        .from('assets')
        .select('*', { count: 'exact', head: true });

      if (assetsError) throw new Error(assetsError.message);

      return {
        totalTickets: totalTickets || 0,
        totalAssets: totalAssets || 0,
      };
    },
  });

const useOpenTicketsCount = () =>
  useQuery<number>({
    queryKey: ['openTicketsCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open');
      if (error) throw new Error(error.message);
      return count || 0;
    },
  });

const useInProgressTicketsCount = () =>
  useQuery<number>({
    queryKey: ['inProgressTicketsCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'in_progress');
      if (error) throw new Error(error.message);
      return count || 0;
    },
  });

const useClosedTicketsCount = () =>
  useQuery<number>({
    queryKey: ['closedTicketsCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'closed');
      if (error) throw new Error(error.message);
      return count || 0;
    },
  });

const useTodayTicketsCount = () => {
  return useQuery({
    queryKey: ['tickets', 'today-count'],
    queryFn: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfDay.toISOString());

      if (error) throw error;

      return count ?? 0;
    },
  });
};

const useOverdueTicketsCount = () => {
  return useQuery({
    queryKey: ['tickets', 'overdue-count'],
    queryFn: async () => {
      const now = new Date().toISOString();

      const { count, error } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .lt('due_at', now)
        .neq('status', 'closed');

      if (error) throw error;

      return count ?? 0;
    },
  });
};

const useAvgResolutionTime = () => {
  return useQuery({
    queryKey: ['tickets', 'avg-resolution-time'],
    queryFn: async () => {
      // 1. ดึง ticket ที่ถูกปิด (จาก history)
      const { data: history, error: historyError } = await supabase
        .from('ticket_history')
        .select('ticket_id, created_at')
        .eq('change_type', 'status_change')
        .eq('new_value', 'closed');

      if (historyError) throw historyError;
      if (!history || history.length === 0) return null;

      const ticketIds = history.map(h => h.ticket_id);

      // 2. ดึง created_at ของ ticket เหล่านั้น
      const { data: tickets, error: ticketError } = await supabase
        .from('tickets')
        .select('id, created_at')
        .in('id', ticketIds);

      if (ticketError) throw ticketError;

      const ticketMap = new Map<string, number>();

      tickets.forEach(t => {
        if (t.created_at) {
          ticketMap.set(t.id, new Date(t.created_at).getTime());
        }
      });

      // 3. คำนวณเวลาที่ใช้
      let totalMs = 0;
      let count = 0;

      history.forEach(h => {
        const createdAt = ticketMap.get(h.ticket_id);
        const closedAt = h.created_at
          ? new Date(h.created_at).getTime()
          : null;


        if (createdAt && closedAt && closedAt > createdAt) {
          totalMs += closedAt - createdAt;
          count++;
        }
      });

      if (count === 0) return null;

      const avgMs = totalMs / count;
      const avgHours = avgMs / (1000 * 60 * 60);

      return Math.round(avgHours * 10) / 10;
    },
  });
};

/* ---------------- Tickets ---------------- */

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

      if (error) throw new Error(error.message);
      return data || [];
    },
  });

const useTicketById = (ticketId: string) =>
  useQuery<Ticket>({
    queryKey: ['ticket', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!ticketId,
  });

const useTicketCategories = () =>
  useQuery<TicketCategory[]>({
    queryKey: ['ticketCategories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw new Error(error.message);
      return data || [];
    },
  });

/* ---------------- Update Ticket ---------------- */
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

  return useMutation({
    mutationFn: async (payload: CreateTicketPayload) => {
      const { data, error } = await supabase
        .from('tickets')
        .insert([
          {
            created_by: payload.user_id,
            title: payload.subject,
            description: payload.description,
            category_id: payload.category_id,
            priority: payload.priority,
            assigned_to: null,
            status: payload.status, // 'open'
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTickets'] });
    },
  });
};

interface UpdateTicketPayload {
  id: string;
  updates: TablesUpdate<'tickets'>;
  userId: string;
}

const useUpdateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation<Ticket, Error, UpdateTicketPayload>({
    mutationFn: async ({ id, updates, userId }) => {
      const { data: oldTicket, error: fetchError } = await supabase
        .from('tickets')
        .select('status, assigned_to, due_at')
        .eq('id', id)
        .single();

      if (fetchError) throw new Error(fetchError.message);

      const { data: updatedTicket, error: updateError } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw new Error(updateError.message);

      type ChangeValue = string | null;
      const normalize = (v?: string | null): ChangeValue => v ?? null;

      const changes: Record<string, { from: ChangeValue; to: ChangeValue }> = {};

      if (updates.status && oldTicket.status !== updates.status) {
        changes.status = {
          from: normalize(oldTicket.status),
          to: normalize(updates.status),
        };
      }

      if (
        updates.assigned_to !== undefined &&
        oldTicket.assigned_to !== updates.assigned_to
      ) {
        changes.assigned_to = {
          from: normalize(oldTicket.assigned_to),
          to: normalize(updates.assigned_to),
        };
      }

      if ('due_at' in updates && oldTicket.due_at !== updates.due_at) {
        changes.due_at = {
          from: normalize(oldTicket.due_at),
          to: normalize(updates.due_at),
        };
      }

      if (Object.keys(changes).length > 0) {
        await supabase.from('ticket_history').insert({
          ticket_id: id,
          user_id: userId,
          change_type: 'bulk_update',
          changes,
        });
      }

      await supabase.rpc('notify_ticket_updated', {
        p_ticket_ids: [id],
        p_message: 'สถานะ Ticket ถูกอัปเดต',
      });

      return updatedTicket;
    },

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['allTickets'] });
      queryClient.invalidateQueries({ queryKey: ['recentTickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.id] });
      queryClient.invalidateQueries({
        queryKey: ['ticketHistory', variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['openTicketsCount'] });
      queryClient.invalidateQueries({ queryKey: ['inProgressTicketsCount'] });
      queryClient.invalidateQueries({ queryKey: ['closedTicketsCount'] });
    },
  });
};

const useTicketComments = (ticketId: string) => {
  return useQuery<TicketComment[], Error>({
    queryKey: ['ticketComments', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_comments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!ticketId,
  });
};
interface AddTicketCommentPayload {
  ticket_id: string;
  user_id: string;
  comment_text: string;
}

const useAddTicketComment = () => {
  const queryClient = useQueryClient();

  return useMutation<TicketComment, Error, AddTicketCommentPayload>({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('ticket_comments')
        .insert(payload)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['ticketComments', variables.ticket_id],
      });
    },
  });
};
const useTicketHistory = (ticketId: string) => {
  return useQuery<TicketHistory[], Error>({
    queryKey: ['ticketHistory', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_history')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!ticketId,
  });
};
const useHistoryAuthors = (history: TicketHistory[] | undefined) => {
  const userIds = Array.from(
    new Set(history?.map(h => h.user_id).filter(Boolean) as string[] || [])
  );

  return useQuery<Record<string, Pick<Profile, 'id' | 'name' | 'email'>>, Error>({
    queryKey: ['historyAuthors', userIds.join(',')],
    queryFn: async () => {
      if (userIds.length === 0) return {};

      const result: Record<string, Pick<Profile, 'id' | 'name' | 'email'>> = {};

      await Promise.all(
        userIds.map(async (id) => {
          const { data } = await supabase
            .from('profiles')
            .select('id, name, email')
            .eq('id', id)
            .maybeSingle();

          if (data) result[id] = data;
        })
      );

      return result;
    },
    enabled: userIds.length > 0,
  });
};

/* ---------------- Export ---------------- */

export const useTickets = {
  useDashboardSummary,
  useRecentTickets,
  useAllTickets,
  useTicketById,
  useTicketCategories,
  useUpdateTicket,

  useCreateTicket,

  useTicketComments,
  useAddTicketComment,
  useTicketHistory,
  useHistoryAuthors,

  useOpenTicketsCount,
  useInProgressTicketsCount,
  useClosedTicketsCount,

  useTodayTicketsCount,
  useOverdueTicketsCount,
  useAvgResolutionTime,
};

