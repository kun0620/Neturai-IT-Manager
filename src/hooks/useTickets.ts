import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Tables, type Enums, TablesUpdate } from '@/types/database.types'; // Changed to import type Enums

// Hook สำหรับดึงข้อมูลสรุป (จำนวน Tickets ทั้งหมด, จำนวน Assets ทั้งหมด)
const useDashboardSummary = () => {
  return useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: async () => {
      // ดึงจำนวน Tickets ทั้งหมด
      const { count: totalTickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true });

      if (ticketsError) {
        throw new Error(ticketsError.message);
      }

      // ดึงจำนวน Assets ทั้งหมด
      const { count: totalAssets, error: assetsError } = await supabase
        .from('assets')
        .select('*', { count: 'exact', head: true });

      if (assetsError) {
        throw new Error(assetsError.message);
      }

      return {
        totalTickets: totalTickets || 0,
        totalAssets: totalAssets || 0,
      };
    },
  });
};

// Hook สำหรับดึงจำนวน Open Tickets
const useOpenTicketsCount = () => {
  return useQuery<number, Error>({
    queryKey: ['openTicketsCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Open');
      if (error) throw new Error(error.message);
      return count || 0;
    },
  });
};

// Hook สำหรับดึงจำนวน In Progress Tickets
const useInProgressTicketsCount = () => {
  return useQuery<number, Error>({
    queryKey: ['inProgressTicketsCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'In Progress');
      if (error) throw new Error(error.message);
      return count || 0;
    },
  });
};

// Hook สำหรับดึงจำนวน Closed Tickets
const useClosedTicketsCount = () => {
  return useQuery<number, Error>({
    queryKey: ['closedTicketsCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Closed');
      if (error) throw new Error(error.message);
      return count || 0;
    },
  });
};

// Hook สำหรับดึง Recent Tickets 5 รายการ
const useRecentTickets = () => {
  return useQuery<Tables<'tickets'>[], Error>({
    queryKey: ['recentTickets', 5],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('id, title, category_id, priority, status, created_at, created_by') // Specific columns as requested
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    },
  });
};

// Hook สำหรับดึง Tickets ทั้งหมด
const useAllTickets = () => {
  return useQuery<Tables<'tickets'>[], Error>({
    queryKey: ['allTickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    },
  });
};

// Hook สำหรับดึง Ticket ตาม ID (ไม่มีการ Join)
const useTicketById = (ticketId: string) => {
  return useQuery<Tables<'tickets'>, Error>({
    queryKey: ['ticket', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
    enabled: !!ticketId, // Only run query if ticketId is available
  });
};

// Hook สำหรับดึงข้อมูลผู้ใช้ตาม ID (สำหรับ created_by และ assigned_to)
const useUserById = (userId: string | null) => {
  return useQuery<Pick<Tables<'users'>, 'id' | 'name' | 'email'>, Error>({
    queryKey: ['user', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is null or undefined');
      }
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('id', userId)
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
    enabled: !!userId, // Only run query if userId is available
  });
};

// Hook สำหรับดึง Ticket Categories ทั้งหมด
const useTicketCategories = () => {
  return useQuery<Tables<'ticket_categories'>[], Error>({
    queryKey: ['ticketCategories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    },
  });
};

// Hook สำหรับสร้าง Ticket ใหม่
interface CreateTicketPayload {
  user_id: string;
  subject: string;
  description: string;
  category_id: string;
  priority: Enums<'ticket_priority'>;
  assignee: string | null;
  status: Enums<'ticket_status'>;
}

const useCreateTicket = () => {
  const queryClient = useQueryClient();
  return useMutation<Tables<'tickets'>, Error, CreateTicketPayload>({
    mutationFn: async (newTicket) => {
      const { data, error } = await supabase
        .from('tickets')
        .insert([
          {
            created_by: newTicket.user_id, // Changed from user_id to created_by
            title: newTicket.subject,
            description: newTicket.description,
            category_id: newTicket.category_id,
            priority: newTicket.priority,
            assigned_to: newTicket.assignee,
            status: newTicket.status,
          },
        ])
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['recentTickets'] });
      queryClient.invalidateQueries({ queryKey: ['allTickets'] });
      queryClient.invalidateQueries({ queryKey: ['openTicketsCount'] });
      queryClient.invalidateQueries({ queryKey: ['inProgressTicketsCount'] });
      queryClient.invalidateQueries({ queryKey: ['closedTicketsCount'] });
    },
  });
};

// Hook สำหรับอัปเดต Ticket
interface UpdateTicketPayload {
  id: string;
  updates: TablesUpdate<'tickets'>;
  userId: string; // User performing the update
}

const useUpdateTicket = () => {
  const queryClient = useQueryClient();
  return useMutation<Tables<'tickets'>, Error, UpdateTicketPayload>({
    mutationFn: async ({ id, updates, userId }) => {
      // 1. Fetch current ticket to get old values for history
      const { data: oldTicket, error: fetchError } = await supabase
        .from('tickets')
        .select('status, priority, assigned_to') // Select relevant fields for history
        .eq('id', id)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch old ticket data: ${fetchError.message}`);
      }

      // 2. Perform the update
      const { data, error } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // 3. Record history if status changed
      if (updates.status && oldTicket?.status !== updates.status) {
        const { error: historyError } = await supabase
          .from('ticket_history')
          .insert({
            ticket_id: id,
            user_id: userId,
            change_type: 'status_change',
            old_value: oldTicket?.status || null,
            new_value: updates.status,
          });

        if (historyError) {
          console.error('Failed to insert ticket history (status):', historyError.message);
          // Don't throw, as the ticket update itself was successful
        }
      }

      // 4. Record history if assigned_to changed
      if (updates.assigned_to !== undefined && oldTicket?.assigned_to !== updates.assigned_to) {
        const { error: historyError } = await supabase
          .from('ticket_history')
          .insert({
            ticket_id: id,
            user_id: userId,
            change_type: 'assigned_to_change',
            old_value: oldTicket?.assigned_to || null,
            new_value: updates.assigned_to || null,
          });

        if (historyError) {
          console.error('Failed to insert ticket history (assigned_to):', historyError.message);
        }
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['allTickets'] });
      queryClient.invalidateQueries({ queryKey: ['recentTickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['ticketHistory', variables.id] }); // Invalidate history
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['openTicketsCount'] });
      queryClient.invalidateQueries({ queryKey: ['inProgressTicketsCount'] });
      queryClient.invalidateQueries({ queryKey: ['closedTicketsCount'] });
    },
  });
};

// Hook สำหรับดึงคอมเมนต์ของ Ticket (ไม่มีการ Join)
const useTicketComments = (ticketId: string) => {
  return useQuery<Tables<'ticket_comments'>[], Error>({
    queryKey: ['ticketComments', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_comments')
        .select('*') // Removed 'users(name, email)' join
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!ticketId,
  });
};

// Hook สำหรับเพิ่มคอมเมนต์ใหม่
interface AddTicketCommentPayload {
  ticket_id: string;
  user_id: string;
  comment_text: string;
}

const useAddTicketComment = () => {
  const queryClient = useQueryClient();
  return useMutation<Tables<'ticket_comments'>, Error, AddTicketCommentPayload>({
    mutationFn: async (newComment) => {
      const { data, error } = await supabase
        .from('ticket_comments')
        .insert([newComment])
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticketComments', variables.ticket_id] });
    },
  });
};

// Hook สำหรับดึงข้อมูลผู้เขียนคอมเมนต์
const useCommentAuthors = (comments: Tables<'ticket_comments'>[] | undefined) => {
  const uniqueUserIds = Array.from(new Set(comments?.map(c => c.user_id).filter(Boolean) as string[] || []));

  return useQuery<Record<string, Pick<Tables<'users'>, 'id' | 'name' | 'email'>>, Error>({
    queryKey: ['commentAuthors', uniqueUserIds.join(',')],
    queryFn: async () => {
      if (uniqueUserIds.length === 0) return {};

      const fetchedAuthors: Record<string, Pick<Tables<'users'>, 'id' | 'name' | 'email'>> = {};

      await Promise.all(uniqueUserIds.map(async (userId) => {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('id, name, email')
            .eq('id', userId)
            .single();
          if (error) throw error;
          if (data) {
            fetchedAuthors[userId] = data;
          }
        } catch (e) {
          console.error(`Failed to fetch user ${userId}:`, e);
        }
      }));
      return fetchedAuthors;
    },
    enabled: uniqueUserIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook สำหรับดึงประวัติ Ticket
const useTicketHistory = (ticketId: string) => {
  return useQuery<Tables<'ticket_history'>[], Error>({
    queryKey: ['ticketHistory', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_history')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!ticketId,
  });
};

// Hook สำหรับดึงข้อมูลผู้เขียนประวัติ
const useHistoryAuthors = (history: Tables<'ticket_history'>[] | undefined) => {
  const uniqueUserIds = Array.from(new Set(history?.map(h => h.user_id).filter(Boolean) as string[] || []));

  return useQuery<Record<string, Pick<Tables<'users'>, 'id' | 'name' | 'email'>>, Error>({
    queryKey: ['historyAuthors', uniqueUserIds.join(',')],
    queryFn: async () => {
      if (uniqueUserIds.length === 0) return {};

      const fetchedAuthors: Record<string, Pick<Tables<'users'>, 'id' | 'name' | 'email'>> = {};

      await Promise.all(uniqueUserIds.map(async (userId) => {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('id, name, email')
            .eq('id', userId)
            .single();
          if (error) throw error;
          if (data) {
            fetchedAuthors[userId] = data;
          }
        } catch (e) {
          console.error(`Failed to fetch user ${userId}:`, e);
        }
      }));
      return fetchedAuthors;
    },
    enabled: uniqueUserIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Export all hooks as a single object named 'useTickets'
export const useTickets = {
  useDashboardSummary,
  useRecentTickets,
  useAllTickets,
  useCreateTicket,
  useTicketById,
  useUserById,
  useTicketCategories,
  useUpdateTicket,
  useTicketComments,
  useAddTicketComment,
  useCommentAuthors,
  useTicketHistory, // Add useTicketHistory
  useHistoryAuthors, // Add useHistoryAuthors
  useOpenTicketsCount, // Add new hook
  useInProgressTicketsCount, // Add new hook
  useClosedTicketsCount, // Add new hook
};
