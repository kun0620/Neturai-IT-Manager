import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useITUsers } from '@/hooks/useITUsers';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  Download,
  Edit3,
  Paperclip,
  RotateCcw,
  Trash2,
  Upload,
  UserPlus,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

import { format, formatDistanceToNowStrict } from 'date-fns';
import { notifyError, notifySuccess } from '@/lib/notify';
import { supabase } from '@/lib/supabase';

import { useTickets } from '@/hooks/useTickets';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentProfile } from '@/hooks/useCurrentProfile';
import type { Database } from '@/types/database.types';
import { useTicketDrawer } from '@/context/TicketDrawerContext';
import { mapLogToText } from '@/features/logs/mapLogToText';
import { logAppearance } from '@/features/logs/logAppearance';
import EditTicketModal from '@/components/EditTicketModal';
import { cn } from '@/lib/utils';


type Ticket = Database['public']['Tables']['tickets']['Row'];
type TicketCategory = Database['public']['Tables']['ticket_categories']['Row'];
type TicketAttachment = Database['public']['Tables']['ticket_attachments']['Row'];
type TimelineItem =
  | {
      type: 'log';
      id: string;
      created_at: string | null;
      user_id: string | null;
      action: string;
      details: Record<string, unknown> | null;
    }
  | {
      type: 'comment';
      id: string;
      created_at: string | null;
      user_id: string | null;
      comment_text: string;
    };


interface TicketDetailsDrawerProps {
  categories: TicketCategory[];
}

const formatTicketCode = (ticketId: string | null | undefined) =>
  ticketId ? `#TIC-${ticketId.slice(0, 4).toUpperCase()}` : '#TIC-0000';

const priorityBadgeClass = (priority: string | null | undefined) => {
  switch (priority) {
    case 'critical':
      return 'border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/30 dark:text-rose-300';
    case 'high':
      return 'border-orange-200 bg-orange-100 text-orange-700 dark:border-orange-900/40 dark:bg-orange-900/30 dark:text-orange-300';
    case 'medium':
      return 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
    case 'low':
      return 'border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/30 dark:text-sky-300';
    default:
      return 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
};

const statusBadgeClass = (status: string | null | undefined) => {
  switch (status) {
    case 'open':
      return 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
    case 'in_progress':
      return 'border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/30 dark:text-amber-300';
    case 'closed':
      return 'border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/30 dark:text-emerald-300';
    default:
      return 'border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/30 dark:text-blue-300';
  }
};

export function TicketDetailsDrawer({ categories }: TicketDetailsDrawerProps) {
  
  
  /* ================= Drawer Context ================= */
  const { ticketId, isOpen, closeDrawer } = useTicketDrawer();
  const safeTicketId = ticketId ?? undefined;

  /* ================= Hooks (ต้องเรียกทุกครั้ง) ================= */
  const {
    useTicketById,
    useUpdateTicket,
    useTicketComments,
    useAddTicketComment,
    useTicketAttachments,
    useUploadTicketAttachment,
    useDeleteTicketAttachment,
    useTicketTimeline,
    useLogAuthors,
  } = useTickets;

  const ticketQuery = useTicketById(safeTicketId);
  const commentsQuery = useTicketComments(safeTicketId);
  const attachmentsQuery = useTicketAttachments(safeTicketId);
  const timelineQuery = useTicketTimeline(safeTicketId);
  const ticketSlaQuery = useQuery({
    queryKey: ['ticket-sla-deadlines', safeTicketId],
    enabled: !!safeTicketId,
    queryFn: async () => {
      if (!safeTicketId) return null;
      const { data, error } = await supabase.rpc('calculate_ticket_sla_deadlines', {
        p_ticket_id: safeTicketId,
      });
      if (error) return null;
      if (!Array.isArray(data) || !data[0]) return null;
      return data[0] as {
        response_due_at: string | null;
        resolution_due_at: string | null;
      };
    },
  });

  const ticket = ticketQuery.data;
  const comments = commentsQuery.data ?? [];
  const timeline = timelineQuery.data ?? [];

  const timelineItems: TimelineItem[] = [
  ...timeline
    .filter((log) => log.action !== 'ticket.comment_added')
    .map((log) => ({
      type: 'log' as const,
      id: log.id,
      created_at: log.created_at,
      user_id: log.user_id,
      action: log.action,
      details: log.details,
    })),
  ...comments.map((c) => ({
    type: 'comment' as const,
    id: c.id,
    created_at: c.created_at,
    user_id: c.user_id,
    comment_text: c.comment_text,
  })),
].sort((a, b) => {
  const aDate = new Date(a.created_at ?? 0);
  const bDate = new Date(b.created_at ?? 0);
  return bDate.getTime() - aDate.getTime();
});


  const { mutate: updateTicket, isPending: isUpdatingTicket } =
    useUpdateTicket();
  const { mutate: addComment, isPending: isAddingComment } =
    useAddTicketComment();
  const { mutate: uploadAttachment, isPending: isUploadingAttachment } =
    useUploadTicketAttachment();
  const { mutate: deleteAttachment, isPending: isDeletingAttachment } =
    useDeleteTicketAttachment();

  const { session } = useAuth();
  const { role } = useCurrentProfile();
  const { data: itUsers } = useITUsers();

  const user = session?.user;
  const isStaff = role === 'admin' || role === 'it';


  const authorsQuery = useLogAuthors(timeline);
  const authors = authorsQuery.data ?? {};


  /* ================= State ================= */
  const [newCommentText, setNewCommentText] = useState('');
  const [selectedStatus, setSelectedStatus] =
    useState<Ticket['status'] | ''>('');
  const [assignedUser, setAssignedUser] = useState('');
  const [draftDueDate, setDraftDueDate] = useState<Date | undefined>();
  const [draftDueTime, setDraftDueTime] = useState('09:00');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreviewUrls, setAttachmentPreviewUrls] = useState<Record<string, string>>({});
  const [selectedPreview, setSelectedPreview] = useState<{
    name: string;
    url: string;
  } | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewOffset, setPreviewOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  /* ================= Sync from ticket ================= */
  useEffect(() => {
    if (ticket?.status) setSelectedStatus(ticket.status);
  }, [ticket?.status]);

  useEffect(() => {
    setAssignedUser(ticket?.assigned_to ?? '');
  }, [ticket?.assigned_to]);

  useEffect(() => {
    if (ticket?.due_at) {
      const d = new Date(ticket.due_at);
      setDraftDueDate(d);
      setDraftDueTime(d.toISOString().slice(11, 16));
    } else {
      setDraftDueDate(undefined);
      setDraftDueTime('09:00');
    }
  }, [ticket?.due_at]);

  /* ================= Handlers ================= */
  const handleStatusChange = (status: Ticket['status']) => {
    if (!user || !ticketId) return;

    updateTicket(
      { id: ticketId, updates: { status }, userId: user.id },
      {
        onSuccess: () => notifySuccess('Status updated'),
        onError: (err) => notifyError(err.message),
      }
    );
  };

  const handleAssignUser = (userId: string) => {
    if (!user || !ticketId) return;

    const normalizedUserId = userId || '';
    setAssignedUser(normalizedUserId);

    updateTicket(
      {
        id: ticketId,
        updates: { assigned_to: normalizedUserId || null },
        userId: user.id,
      },
      {
        onSuccess: () => notifySuccess('Ticket assigned'),
        onError: (err) => notifyError(err.message),
      }
    );
  };

  const handleAddComment = () => {
    if (!user || !ticketId || !newCommentText.trim()) return;

    addComment(
      {
        ticket_id: ticketId,
        user_id: user.id,
        comment_text: newCommentText.trim(),
      },
      {
        onSuccess: () => {
          setNewCommentText('');
          notifySuccess('Comment added');
        },
        onError: (err) => notifyError(err.message),
      }
    );
  };

  const handleConfirmDueDate = () => {
    if (!ticket || !user || !draftDueDate) return;

    const [h, m] = draftDueTime.split(':').map(Number);
    const due = new Date(draftDueDate);
    due.setHours(h, m, 0);

    updateTicket(
      {
        id: ticket.id,
        updates: { due_at: due.toISOString() },
        userId: user.id,
      },
      {
        onSuccess: () => notifySuccess('Due date updated'),
        onError: (err) => notifyError(err.message),
      }
    );
  };

  const handleUploadAttachment = () => {
    if (!ticketId || !user || !attachmentFile) return;

    uploadAttachment(
      { ticketId, file: attachmentFile },
      {
        onSuccess: () => {
          setAttachmentFile(null);
          notifySuccess('Attachment uploaded');
        },
        onError: (err) => notifyError(err.message),
      }
    );
  };

  const handleDownloadAttachment = async (attachment: TicketAttachment) => {
    const { data, error } = await supabase.storage
      .from('ticket-attachments')
      .download(attachment.storage_path);

    if (error) {
      notifyError(error.message);
      return;
    }

    const blobUrl = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = attachment.file_name;
    link.click();
    URL.revokeObjectURL(blobUrl);
  };

  const handleDeleteAttachment = (attachment: TicketAttachment) => {
    if (!ticketId) return;

    deleteAttachment(
      {
        attachmentId: attachment.id,
        ticketId,
        storagePath: attachment.storage_path,
      },
      {
        onSuccess: () => notifySuccess('Attachment deleted'),
        onError: (err) => notifyError(err.message),
      }
    );
  };

  const openImagePreview = (name: string, url: string) => {
    setPreviewZoom(1);
    setPreviewOffset({ x: 0, y: 0 });
    setSelectedPreview({ name, url });
  };

  const handlePreviewWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    setPreviewZoom((prev) => {
      const next = prev + (event.deltaY < 0 ? 0.1 : -0.1);
      return Math.min(3, Math.max(0.5, Number(next.toFixed(2))));
    });
  };

  const handlePreviewMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    setIsPanning(true);
    panStartRef.current = {
      x: event.clientX - previewOffset.x,
      y: event.clientY - previewOffset.y,
    };
  };

  const handlePreviewMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning || !panStartRef.current) return;
    setPreviewOffset({
      x: event.clientX - panStartRef.current.x,
      y: event.clientY - panStartRef.current.y,
    });
  };

  const stopPreviewPan = () => {
    setIsPanning(false);
    panStartRef.current = null;
  };

  const handleEditShortcut = () => {
    setIsEditDialogOpen(true);
  };

  /* ================= Helpers ================= */
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
  const getCategoryName = (id: string | null) =>
    id ? categoryMap.get(id) ?? 'N/A' : 'N/A';

  const isOverdue =
    !!ticket?.due_at &&
    new Date(ticket.due_at).getTime() < Date.now() &&
    ticket.status !== 'closed';

  const getSlaMeta = (dueAt: string | null) => {
    if (!dueAt) {
      return { text: 'N/A', badge: 'outline' as const };
    }

    const dueDate = new Date(dueAt);
    if (Number.isNaN(dueDate.getTime())) {
      return { text: 'N/A', badge: 'outline' as const };
    }

    if (ticket?.status === 'closed') {
      return { text: 'Closed', badge: 'secondary' as const };
    }

    if (dueDate.getTime() < Date.now()) {
      return { text: `Breached ${formatDistanceToNowStrict(dueDate)} ago`, badge: 'destructive' as const };
    }

    return { text: `Due in ${formatDistanceToNowStrict(dueDate)}`, badge: 'secondary' as const };
  };

  const responseSlaMeta = getSlaMeta(ticketSlaQuery.data?.response_due_at ?? null);
  const resolutionSlaMeta = getSlaMeta(ticketSlaQuery.data?.resolution_due_at ?? null);

  const itUserMap = new Map(
    (itUsers ?? []).map((u) => [u.id, u.name ?? u.id])
  );
  const attachments = useMemo(() => attachmentsQuery.data ?? [], [attachmentsQuery.data]);
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  const isImageAttachment = (attachment: TicketAttachment) => {
    if (attachment.content_type?.startsWith('image/')) return true;
    return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(attachment.file_name);
  };

  useEffect(() => {
    const loadAttachmentPreviews = async () => {
      const imageAttachments = attachments.filter(isImageAttachment);
      if (imageAttachments.length === 0) {
        setAttachmentPreviewUrls({});
        return;
      }

      const uniquePaths = Array.from(
        new Set(imageAttachments.map((attachment) => attachment.storage_path))
      );
      const { data, error } = await supabase.storage
        .from('ticket-attachments')
        .createSignedUrls(uniquePaths, 3600);

      if (error || !data) return;

      const nextUrls: Record<string, string> = {};
      data.forEach((item, index) => {
        if (item.signedUrl) {
          nextUrls[uniquePaths[index]] = item.signedUrl;
        }
      });
      setAttachmentPreviewUrls(nextUrls);
    };

    void loadAttachmentPreviews();
  }, [attachments]);

  

  /* ================= Render ================= */
  return (
    <Drawer open={isOpen} onOpenChange={(o) => !o && closeDrawer()}>
      <DrawerContent className="mt-0 h-screen rounded-none border-l border-slate-200 border-t-0 bg-white p-0 text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[400px] lg:[&>div:first-child]:hidden">
        <DrawerHeader className="h-16 flex-row items-center justify-between border-b border-slate-200 bg-white px-6 py-0 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <span className="rounded bg-primary/10 px-2 py-1 text-xs font-black text-primary">
              {formatTicketCode(ticket?.id)}
            </span>
            <DrawerTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Ticket Details
            </DrawerTitle>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            aria-label="Close ticket details"
          >
            <X className="h-4 w-4" />
          </button>
          <DrawerDescription className="sr-only">
            View the selected ticket information, comments and history
          </DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="w-full p-6">

            {!ticketId ? (
              <p className="text-center text-muted-foreground">
                No ticket selected
              </p>
            ) : ticketQuery.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : !ticket ? (
              <p className="text-center text-muted-foreground">
                Ticket not found
              </p>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="mb-4 text-[1.35rem] font-bold leading-tight text-slate-900 dark:text-slate-100">
                    {ticket.title}
                  </h2>
                  <div className="mb-5 flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        'rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em]',
                        priorityBadgeClass(ticket.priority)
                      )}
                    >
                      {ticket.priority || 'priority'}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        'rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em]',
                        statusBadgeClass(ticket.status)
                      )}
                    >
                      {ticket.status?.replace('_', ' ') || 'status'}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="rounded-md border-slate-200 bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {getCategoryName(ticket.category_id)}
                    </Badge>
                    {isOverdue && (
                      <Badge
                        variant="outline"
                        className="rounded-md border-rose-200 bg-rose-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/30 dark:text-rose-300"
                      >
                        Overdue
                      </Badge>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Created</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {ticket.created_at
                          ? format(new Date(ticket.created_at), 'MMM dd, yyyy HH:mm')
                          : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Assignee</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {ticket.assigned_to ? itUserMap.get(ticket.assigned_to) : 'Unassigned'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">SLA Deadline</span>
                      <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                        {resolutionSlaMeta.text}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h4 className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Description
                  </h4>
                  <p className="rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
                    {ticket.description || 'N/A'}
                  </p>
                </div>

                <div className="mb-8">
                  <h3 className="mb-4 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Ticket Controls
                  </h3>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Status</p>
                    <Select
                      value={selectedStatus}
                      onValueChange={(v) =>
                        handleStatusChange(v as Ticket['status'])
                      }
                      disabled={!isStaff || isUpdatingTicket}
                    >
                      <SelectTrigger className="h-11 border-slate-200 bg-slate-50 text-slate-900 shadow-none hover:bg-slate-100 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="z-50 border-slate-200 bg-white text-slate-900 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Assignee</p>

                      {isStaff ? (
                        <Select
                          value={assignedUser ?? ''}
                          onValueChange={handleAssignUser}
                        >
                          <SelectTrigger className="h-11 border-slate-200 bg-slate-50 text-slate-900 shadow-none hover:bg-slate-100 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
                            <SelectValue placeholder="Unassigned" />
                          </SelectTrigger>

                          <SelectContent className="z-[9999] border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                            <SelectItem value="">
                              <span className="text-slate-500 dark:text-slate-400">
                                Unassigned
                              </span>
                            </SelectItem>

                            {(itUsers ?? []).map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.name || u.id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (

                      <p className="rounded-lg bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {ticket.assigned_to
                          ? itUserMap.get(ticket.assigned_to)
                          : 'Unassigned'}
                      </p>
                    )}
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Due Date
                    </p>

                    {isStaff ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-10 flex-1 justify-start border-slate-200 bg-slate-50 text-left font-medium text-slate-700 shadow-none hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                            >
                              {draftDueDate
                                ? format(draftDueDate, 'MMM dd, yyyy')
                                : 'Pick date'}
                            </Button>
                          </PopoverTrigger>

                          <PopoverContent
                            className="z-[9999] w-auto border-slate-200 bg-white p-0 shadow-xl dark:border-slate-700 dark:bg-slate-900"
                          >
                            <Calendar
                              mode="single"
                              selected={draftDueDate}
                              onSelect={setDraftDueDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>

                        <input
                          type="time"
                          value={draftDueTime}
                          onChange={(e) =>
                            setDraftDueTime(e.target.value)
                          }
                          className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 shadow-none outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        />
                        </div>

                        <Button
                          size="sm"
                          onClick={handleConfirmDueDate}
                          disabled={isUpdatingTicket || !draftDueDate}
                          className="h-10 w-full"
                        >
                          Save Due Date
                        </Button>
                      </div>
                    ) : (

                    <p className="rounded-lg bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {ticket.due_at
                        ? format(
                            new Date(ticket.due_at),
                            'MMM dd, yyyy'
                          )
                        : 'N/A'}
                    </p>
                  )}
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">SLA Response Due</p>
                      <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                      {ticketSlaQuery.data?.response_due_at
                        ? format(new Date(ticketSlaQuery.data.response_due_at), 'MMM dd, yyyy HH:mm')
                        : 'N/A'}
                      </p>
                      <Badge variant={responseSlaMeta.badge} className="mt-3">
                      {responseSlaMeta.text}
                      </Badge>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">SLA Resolution Due</p>
                      <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                      {ticketSlaQuery.data?.resolution_due_at
                        ? format(new Date(ticketSlaQuery.data.resolution_due_at), 'MMM dd, yyyy HH:mm')
                        : 'N/A'}
                      </p>
                      <Badge variant={resolutionSlaMeta.badge} className="mt-3">
                      {resolutionSlaMeta.text}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="mb-8 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                      Attachments
                    </h3>
                    <Badge
                      variant="outline"
                      className="rounded-full border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {attachments.length}
                    </Badge>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        type="file"
                        onChange={(event) =>
                          setAttachmentFile(event.target.files?.[0] ?? null)
                        }
                        className="sm:max-w-sm"
                      />
                      <Button
                        size="sm"
                        onClick={handleUploadAttachment}
                        disabled={!attachmentFile || !user || isUploadingAttachment}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload
                      </Button>
                    </div>

                    {attachmentsQuery.isLoading ? (
                      <Skeleton className="h-16 w-full" />
                    ) : attachments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No attachments</p>
                    ) : (
                      <div className="space-y-2">
                        {attachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5 dark:border-slate-800"
                          >
                            <div className="min-w-0 flex items-center gap-3">
                              {isImageAttachment(attachment) &&
                              attachmentPreviewUrls[attachment.storage_path] ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openImagePreview(
                                      attachment.file_name,
                                      attachmentPreviewUrls[attachment.storage_path]
                                    )
                                  }
                                  className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700"
                                  title="Preview image"
                                >
                                  <img
                                    src={attachmentPreviewUrls[attachment.storage_path]}
                                    alt={attachment.file_name}
                                    className="h-full w-full object-cover"
                                  />
                                </button>
                              ) : (
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-400 dark:border-slate-700 dark:text-slate-500">
                                  <Paperclip className="h-4 w-4" />
                                </span>
                              )}

                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {attachment.file_name}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {formatSize(attachment.size_bytes)} •{' '}
                                  {format(new Date(attachment.created_at), 'MMM dd, yyyy HH:mm')}
                                </p>
                              </div>
                            </div>

                            <div className="ml-3 flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownloadAttachment(attachment)}
                                title="Download attachment"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              {(isStaff || attachment.uploaded_by === user?.id) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteAttachment(attachment)}
                                  disabled={isDeletingAttachment}
                                  title="Delete attachment"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <Dialog
                  open={!!selectedPreview}
                  onOpenChange={(open) => {
                    if (!open) {
                      setSelectedPreview(null);
                      setPreviewZoom(1);
                      setPreviewOffset({ x: 0, y: 0 });
                    }
                  }}
                >
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>{selectedPreview?.name ?? 'Image preview'}</DialogTitle>
                      <DialogDescription className="sr-only">
                        Preview ticket attachment image.
                      </DialogDescription>
                    </DialogHeader>
                    {selectedPreview?.url && (
                      <>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              setPreviewZoom((prev) => Math.max(0.5, Number((prev - 0.25).toFixed(2))))
                            }
                            title="Zoom out"
                          >
                            <ZoomOut className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setPreviewZoom(1);
                              setPreviewOffset({ x: 0, y: 0 });
                            }}
                            title="Reset zoom"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              setPreviewZoom((prev) => Math.min(3, Number((prev + 0.25).toFixed(2))))
                            }
                            title="Zoom in"
                          >
                            <ZoomIn className="h-4 w-4" />
                          </Button>
                        </div>

                        <div
                          className={`max-h-[70vh] overflow-hidden rounded-md border border-border/70 p-2 ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
                          onWheel={handlePreviewWheel}
                          onMouseDown={handlePreviewMouseDown}
                          onMouseMove={handlePreviewMouseMove}
                          onMouseUp={stopPreviewPan}
                          onMouseLeave={stopPreviewPan}
                        >
                          <img
                            src={selectedPreview.url}
                            alt={selectedPreview.name}
                            className="mx-auto h-auto max-h-[65vh] w-auto object-contain transition-transform"
                            style={{
                              transform: `translate(${previewOffset.x}px, ${previewOffset.y}px) scale(${previewZoom})`,
                              transformOrigin: 'center center',
                              userSelect: 'none',
                              pointerEvents: 'none',
                            }}
                          />
                        </div>
                      </>
                    )}
                  </DialogContent>
                </Dialog>

                <EditTicketModal
                  isOpen={isEditDialogOpen}
                  onClose={setIsEditDialogOpen}
                  isStaff={isStaff}
                  isUpdatingTicket={isUpdatingTicket}
                  selectedStatus={selectedStatus}
                  onStatusChange={(status) => handleStatusChange(status as Ticket['status'])}
                  assignedUser={assignedUser}
                  onAssignUser={handleAssignUser}
                  users={itUsers ?? []}
                  draftDueDate={draftDueDate}
                  draftDueTime={draftDueTime}
                  onDraftDueDateChange={setDraftDueDate}
                  onDraftDueTimeChange={setDraftDueTime}
                  onSaveDueDate={handleConfirmDueDate}
                  currentAssigneeLabel={
                    ticket.assigned_to
                      ? itUserMap.get(ticket.assigned_to) ?? 'Unassigned'
                      : 'Unassigned'
                  }
                  currentDueDateLabel={
                    ticket.due_at
                      ? format(new Date(ticket.due_at), 'MMM dd, yyyy')
                      : 'N/A'
                  }
                />

                <h3 className="mb-4 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                  Activity Log
                </h3>

                <div className="mb-6 relative space-y-5 before:absolute before:bottom-0 before:left-[11px] before:top-2 before:w-px before:bg-slate-200 dark:before:bg-slate-800">
                  {timelineItems.map((item) => {
                    if (item.type === 'comment') {
                      const author =
                        item.user_id && authors[item.user_id]
                          ? authors[item.user_id].name ||
                            authors[item.user_id].email
                          : 'User';

                      return (
                        <div key={`c-${item.id}`} className="relative pl-8">
                          <span className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-white ring-4 ring-white dark:ring-slate-900">
                            💬
                          </span>

                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {author}{' '}
                            <span className="font-normal text-slate-400">added a comment</span>
                          </p>

                          <p className="mt-2 rounded-lg bg-slate-50 p-3 text-xs leading-6 text-slate-600 whitespace-pre-line dark:bg-slate-800 dark:text-slate-300">
                            {item.comment_text}
                          </p>

                          <p className="mt-2 text-xs text-slate-400">
                            {item.created_at
                              ? format(
                                  new Date(item.created_at),
                                  'MMM dd, yyyy HH:mm'
                                )
                              : '—'}
                          </p>
                        </div>
                      );
                    }

                    let text = mapLogToText(item.action, item.details);
                    if (item.action === 'ticket.assigned') {
                      const assigneeId = item.details?.to as string | null;
                      const assigneeName = assigneeId
                        ? itUserMap.get(assigneeId) ?? assigneeId
                        : '—';
                      text = {
                        title: 'Ticket assigned',
                        description: `Assigned to ${assigneeName}`,
                      };
                    }
                    if (item.action === 'ticket.unassigned') {
                      const previousId = item.details?.from as string | null;
                      const previousName = previousId
                        ? itUserMap.get(previousId) ?? previousId
                        : '—';
                      text = {
                        title: 'Ticket unassigned',
                        description: previousId
                          ? `Unassigned from ${previousName}`
                          : undefined,
                      };
                    }
                    const { icon: Icon, color } = logAppearance(item.action);

                    const author =
                      item.user_id && authors[item.user_id]
                        ? authors[item.user_id].name ||
                          authors[item.user_id].email
                        : 'System';

                    return (
                      <div key={`l-${item.id}`} className="relative pl-8">
                        <span className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white ring-4 ring-white dark:bg-slate-900 dark:ring-slate-900">
                          <Icon size={16} className={color} />
                        </span>

                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {text.title}
                          <span className="font-normal text-slate-400">
                            {' '}
                            by {author}
                          </span>
                        </p>

                        {text.description && (
                          <p className="mt-1 text-sm leading-6 text-slate-600 whitespace-pre-line dark:text-slate-300">
                            {text.description}
                          </p>
                        )}

                        <p className="mt-2 text-xs text-slate-400">
                          {item.created_at
                            ? format(
                                new Date(item.created_at),
                                'MMM dd, yyyy HH:mm'
                              )
                            : '—'}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <h3 className="mb-4 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                  Add Comment
                </h3>

                <Textarea
                  placeholder="Add a comment..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="min-h-[110px] rounded-xl border-slate-200 bg-slate-50 shadow-none focus-visible:ring-primary/20 dark:border-slate-700 dark:bg-slate-800"
                />

                <Button
                  className="mt-3 h-10 w-full"
                  onClick={handleAddComment}
                  disabled={!user || isAddingComment}
                >
                  Add Comment
                </Button>
              </>
            )}
          </div>
        </ScrollArea>
        <div className="grid h-16 grid-cols-3 gap-2 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <Button
            type="button"
            variant="ghost"
            className="h-full flex-col gap-1 rounded-lg text-[10px] font-bold uppercase tracking-wide text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <UserPlus className="h-4 w-4" />
            Assign
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleEditShortcut}
            className="h-full flex-col gap-1 rounded-lg text-[10px] font-bold uppercase tracking-wide text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <Edit3 className="h-4 w-4" />
            Edit
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleStatusChange('closed')}
            disabled={!isStaff || isUpdatingTicket}
            className="h-full flex-col gap-1 rounded-lg bg-emerald-500/10 text-[10px] font-bold uppercase tracking-wide text-emerald-600 hover:bg-emerald-500/20"
          >
            <CheckCircle2 className="h-4 w-4" />
            Close
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
