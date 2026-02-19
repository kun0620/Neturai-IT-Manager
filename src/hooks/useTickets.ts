import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';
import type { TablesUpdate } from '@/types/database.types';

/* ================= Types ================= */

type Ticket = Database['public']['Tables']['tickets']['Row'];
type TicketCategory = Database['public']['Tables']['ticket_categories']['Row'];
type TicketComment = Database['public']['Tables']['ticket_comments']['Row'];
type TicketAttachment = Database['public']['Tables']['ticket_attachments']['Row'];

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

type DashboardMetrics = {
  totalTickets: number;
  totalAssets: number;
  openTicketsCount: number;
  inProgressTicketsCount: number;
  closedTicketsCount: number;
  todayTicketsCount: number;
  overdueTicketsCount: number;
  avgResolutionHours: number | null;
  openTrendDelta: number;
  inProgressTrendDelta: number;
  closedTrendDelta: number;
  todayTrendDelta: number;
  overdueTrendDelta: number;
  recentTickets: RecentTicket[];
};

type DashboardMetricsOptions = {
  userId?: string | null;
  onlyMy?: boolean;
};

const TICKET_ATTACHMENTS_BUCKET = 'ticket-attachments';
const DEFAULT_ATTACHMENT_MAX_MB = 10;
const DEFAULT_ATTACHMENT_ALLOWED_TYPES = [
  'image/*',
];

const normalizeExt = (name: string) => {
  const match = name.toLowerCase().match(/(\.[a-z0-9]+)$/i);
  return match?.[1] ?? '';
};

const isAllowedByRule = (rule: string, mimeType: string, ext: string) => {
  const normalized = rule.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.startsWith('.')) return ext === normalized;
  if (normalized.endsWith('/*')) {
    const prefix = normalized.slice(0, -1);
    return mimeType.startsWith(prefix);
  }
  return mimeType === normalized;
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

const useDashboardMetrics = (options: DashboardMetricsOptions = {}) =>
  useQuery<DashboardMetrics>({
    queryKey: ['dashboardMetrics', options.userId ?? null, !!options.onlyMy],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dashboard_metrics', {
        p_user_id: options.userId ?? null,
        p_only_my: !!options.onlyMy,
      });
      if (error) throw error;

      const row = data?.[0];
      if (!row) {
        return {
          totalTickets: 0,
          totalAssets: 0,
          openTicketsCount: 0,
          inProgressTicketsCount: 0,
          closedTicketsCount: 0,
          todayTicketsCount: 0,
          overdueTicketsCount: 0,
          avgResolutionHours: null,
          openTrendDelta: 0,
          inProgressTrendDelta: 0,
          closedTrendDelta: 0,
          todayTrendDelta: 0,
          overdueTrendDelta: 0,
          recentTickets: [],
        };
      }

      const recentTicketsRaw = Array.isArray(row.recent_tickets)
        ? row.recent_tickets
        : [];

      const recentTickets: RecentTicket[] = recentTicketsRaw
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const record = item as Record<string, unknown>;
          const id = record.id;
          const title = record.title;
          if (typeof id !== 'string' || typeof title !== 'string') return null;

          return {
            id,
            title,
            category_id:
              typeof record.category_id === 'string' ? record.category_id : null,
            priority:
              typeof record.priority === 'string' ? record.priority : 'low',
            status:
              record.status === 'open' ||
              record.status === 'in_progress' ||
              record.status === 'closed'
                ? record.status
                : 'open',
            created_at:
              typeof record.created_at === 'string' ? record.created_at : null,
          };
        })
        .filter((ticket): ticket is RecentTicket => ticket !== null);

      return {
        totalTickets: Number(row.total_tickets ?? 0),
        totalAssets: Number(row.total_assets ?? 0),
        openTicketsCount: Number(row.open_tickets_count ?? 0),
        inProgressTicketsCount: Number(row.in_progress_tickets_count ?? 0),
        closedTicketsCount: Number(row.closed_tickets_count ?? 0),
        todayTicketsCount: Number(row.today_tickets_count ?? 0),
        overdueTicketsCount: Number(row.overdue_tickets_count ?? 0),
        avgResolutionHours:
          row.avg_resolution_hours === null
            ? null
            : Number(row.avg_resolution_hours),
        openTrendDelta: Number(row.open_trend_delta ?? 0),
        inProgressTrendDelta: Number(row.in_progress_trend_delta ?? 0),
        closedTrendDelta: Number(row.closed_trend_delta ?? 0),
        todayTrendDelta: Number(row.today_trend_delta ?? 0),
        overdueTrendDelta: Number(row.overdue_trend_delta ?? 0),
        recentTickets,
      };
    },
  });

/* ================= Tickets ================= */

const useRecentTickets = (limit = 20) =>
  useQuery<RecentTicket[]>({
    queryKey: ['recentTickets', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('id, title, category_id, priority, status, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

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
  assigned_to?: string | null;
}

const useCreateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation<Ticket, Error, CreateTicketPayload>({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('tickets')
        .insert({
          created_by: payload.user_id,
          assigned_to: payload.assigned_to ?? null,
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
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
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
      const { data: updatedTicket, error: updateError } = await supabase.rpc(
        'update_ticket_with_logs',
        {
          p_id: id,
          p_updates: updates,
          p_user_id: userId,
        }
      );

      if (updateError) throw updateError;
      return updatedTicket as Ticket;
    },

    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['ticket', v.id] });
      queryClient.invalidateQueries({ queryKey: ['allTickets'] });
      queryClient.invalidateQueries({ queryKey: ['recentTickets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
};

/* ================= Comments ================= */

interface AddTicketCommentPayload {
  ticket_id: string;
  user_id: string;
  comment_text: string;
}

interface UploadTicketAttachmentPayload {
  ticketId: string;
  file: File;
}

interface DeleteTicketAttachmentPayload {
  attachmentId: string;
  ticketId: string;
  storagePath: string;
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

/* ================= Attachments ================= */

const useTicketAttachments = (ticketId?: string) =>
  useQuery<TicketAttachment[]>({
    queryKey: ['ticketAttachments', ticketId],
    enabled: !!ticketId,
    queryFn: async () => {
      if (!ticketId) return [];

      const { data, error } = await supabase
        .from('ticket_attachments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });

const useUploadTicketAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation<TicketAttachment, Error, UploadTicketAttachmentPayload>({
    mutationFn: async ({ ticketId, file }) => {
      const { data: settingRows } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['attachment_max_size_mb', 'attachment_allowed_types']);

      const settingMap = new Map((settingRows ?? []).map((row) => [row.key, row.value]));
      const maxSizeMb = Number(
        settingMap.get('attachment_max_size_mb') ?? DEFAULT_ATTACHMENT_MAX_MB
      );
      const maxBytes = Number.isFinite(maxSizeMb) && maxSizeMb > 0
        ? maxSizeMb * 1024 * 1024
        : DEFAULT_ATTACHMENT_MAX_MB * 1024 * 1024;
      if (file.size > maxBytes) {
        throw new Error(`File is too large. Maximum allowed is ${Math.floor(maxBytes / (1024 * 1024))} MB.`);
      }

      const allowedRulesRaw =
        settingMap.get('attachment_allowed_types') ??
        DEFAULT_ATTACHMENT_ALLOWED_TYPES.join(',');
      const allowedRules = allowedRulesRaw
        .split(',')
        .map((rule) => rule.trim())
        .filter(Boolean);
      const mimeType = (file.type || '').toLowerCase();
      const ext = normalizeExt(file.name);

      const isAllowed = allowedRules.some((rule) =>
        isAllowedByRule(rule, mimeType, ext)
      );
      if (!isAllowed) {
        throw new Error('File type is not allowed by attachment policy.');
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const randomId =
        globalThis.crypto?.randomUUID?.() ??
        `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const storagePath = `${ticketId}/${Date.now()}-${randomId}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(TICKET_ATTACHMENTS_BUCKET)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || undefined,
        });

      if (uploadError) throw uploadError;

      const { data, error: insertError } = await supabase.rpc(
        'create_ticket_attachment',
        {
          p_ticket_id: ticketId,
          p_file_name: file.name,
          p_storage_path: storagePath,
          p_content_type: file.type || null,
          p_size_bytes: file.size,
        }
      );

      if (insertError) {
        await supabase.storage.from(TICKET_ATTACHMENTS_BUCKET).remove([storagePath]);
        throw insertError;
      }
      if (!data) {
        await supabase.storage.from(TICKET_ATTACHMENTS_BUCKET).remove([storagePath]);
        throw new Error('Attachment rejected by policy or permission.');
      }
      return data as TicketAttachment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['ticketAttachments', variables.ticketId],
      });
    },
  });
};

const useDeleteTicketAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, DeleteTicketAttachmentPayload>({
    mutationFn: async ({ attachmentId, storagePath }) => {
      const { error: storageError } = await supabase.storage
        .from(TICKET_ATTACHMENTS_BUCKET)
        .remove([storagePath]);

      if (storageError) throw storageError;

      const { error: deleteError } = await supabase
        .from('ticket_attachments')
        .delete()
        .eq('id', attachmentId);

      if (deleteError) throw deleteError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['ticketAttachments', variables.ticketId],
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

/* ================= Export ================= */

export const useTickets = {
  useDashboardMetrics,

  useRecentTickets,
  useAllTickets,
  useTicketById,
  useTicketCategories,

  useCreateTicket,
  useUpdateTicket,

  useTicketComments,
  useAddTicketComment,
  useTicketAttachments,
  useUploadTicketAttachment,
  useDeleteTicketAttachment,
  useTicketTimeline,
  useLogAuthors,
};
