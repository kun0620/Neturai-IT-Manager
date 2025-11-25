import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Tables, Enums } from '@/types/database.types';

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

// Hook สำหรับดึง Recent Tickets 5 รายการ
const useRecentTickets = () => {
  return useQuery<Tables<'tickets'>[], Error>({
    queryKey: ['recentTickets', 5],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
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

// Hook สำหรับดึง Ticket ตาม ID
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
  category_id: string; // Changed from category (enum) to category_id (string)
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
            user_id: newTicket.user_id,
            title: newTicket.subject,
            description: newTicket.description,
            category_id: newTicket.category_id, // Use category_id
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
      // Invalidate relevant queries to refetch data after a new ticket is created
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['recentTickets'] });
      queryClient.invalidateQueries({ queryKey: ['allTickets'] }); // Invalidate allTickets query
    },
  });
};

// Export all hooks as a single object named 'useTickets'
export const useTickets = {
  useDashboardSummary,
  useRecentTickets,
  useAllTickets, // Add useAllTickets to the exported object
  useCreateTicket,
  useTicketById, // Add useTicketById
  useTicketCategories, // Add useTicketCategories
};
