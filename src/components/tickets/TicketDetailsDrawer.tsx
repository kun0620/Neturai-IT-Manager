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
import { Separator } from '@/components/ui/separator';
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
      <DrawerContent className="mt-0 h-screen rounded-none border-l border-slate-200 border-t-0 p-0 lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[400px] dark:border-slate-800 lg:[&>div:first-child]:hidden">
        <DrawerHeader className="h-16 flex-row items-center justify-between border-b border-slate-200 px-6 py-0 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="rounded bg-primary/10 px-2 py-1 text-xs font-black text-primary">
              {ticket?.id ? `#TIC-${ticket.id.slice(0, 4).toUpperCase()}` : '#TIC-0000'}
            </span>
            <DrawerTitle className="text-sm font-bold">Ticket Details</DrawerTitle>
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
                <h2 className="mb-4 text-3xl font-bold leading-tight tracking-tight">
                  {ticket.title}
                </h2>
                <div className="mb-4 flex flex-wrap gap-2">
                  <Badge variant="destructive" className="text-[10px] font-black uppercase">
                    {ticket.priority || 'priority'}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] font-black uppercase">
                    {ticket.status?.replace('_', ' ') || 'status'}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] font-black uppercase">
                    {getCategoryName(ticket.category_id)}
                  </Badge>
                  {isOverdue && (
                    <Badge variant="destructive" className="text-[10px] font-black uppercase">
                      Overdue
                    </Badge>
                  )}
                </div>

                <div className="mb-6 space-y-4 text-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 py-2 dark:border-slate-800">
                    <span className="font-medium text-slate-500">Created</span>
                    <span className="font-semibold">
                      {ticket.created_at
                        ? format(new Date(ticket.created_at), 'MMM dd, yyyy HH:mm')
                        : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 py-2 dark:border-slate-800">
                    <span className="font-medium text-slate-500">Assignee</span>
                    <span className="font-semibold">
                      {ticket.assigned_to ? itUserMap.get(ticket.assigned_to) : 'Unassigned'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 py-2 dark:border-slate-800">
                    <span className="font-medium text-slate-500">SLA Deadline</span>
                    <span className="font-bold text-rose-600">
                      {resolutionSlaMeta.text}
                    </span>
                  </div>
                </div>

                <div className="mb-8">
                  <h4 className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">
                    Description
                  </h4>
                  <p className="rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
                    {ticket.description || 'N/A'}
                  </p>
                </div>

                <Separator />

                {/* BASIC INFO */}
                <div className="my-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p>{ticket.description || 'N/A'}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <p>{getCategoryName(ticket.category_id)}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Created At</p>
                    <p className="text-muted-foreground">
                      {ticket.created_at
                        ? format(
                            new Date(ticket.created_at),
                            'MMM dd, yyyy HH:mm'
                          )
                        : '—'}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* STATUS & ASSIGN */}
                <div className="grid grid-cols-2 gap-4 my-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Select
                      value={selectedStatus}
                      onValueChange={(v) =>
                        handleStatusChange(v as Ticket['status'])
                      }
                      disabled={!isStaff || isUpdatingTicket}
                    >
                      <SelectTrigger
                        className="
                          w-[180px]
                          bg-white
                          border border-gray-300
                          text-gray-900
                          shadow-sm
                          hover:bg-gray-50
                          focus:ring-2 focus:ring-blue-500
                        "
                      >
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                        <SelectContent
                          className="
                            bg-white
                            text-gray-900
                            border
                            shadow-lg
                            z-50
                          "
                        >
                        <SelectItem
                          value="open"
                          className="focus:bg-muted"
                        >
                          Open
                        </SelectItem>

                        <SelectItem
                          value="in_progress"
                          className="focus:bg-muted"
                        >
                          In Progress
                        </SelectItem>

                        <SelectItem
                          value="closed"
                          className="focus:bg-muted"
                        >
                          Closed
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Assigned To</p>

                      {isStaff ? (
                        <Select
                          value={assignedUser ?? ''}
                          onValueChange={handleAssignUser}
                        >
                          <SelectTrigger
                            className="
                              w-[180px]
                              bg-card
                              border border-border
                              text-foreground
                              shadow-sm
                              hover:bg-muted
                              focus:ring-2 focus:ring-ring
                            "
                          >
                            <SelectValue placeholder="Unassigned" />
                          </SelectTrigger>

                          <SelectContent
                            className="
                              z-[9999]
                              bg-card
                              border border-border
                              shadow-xl
                            "
                          >
                            <SelectItem value="">
                              <span className="text-muted-foreground">
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

                      <p>
                        {ticket.assigned_to
                          ? itUserMap.get(ticket.assigned_to)
                          : 'Unassigned'}
                      </p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* DUE DATE */}
                  <div className="my-4">
                    <p className="text-sm text-muted-foreground mb-1">
                      Due Date
                    </p>

                    {isStaff ? (
                      <div className="flex items-center gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="
                                bg-card
                                border border-border
                                shadow-sm
                                hover:bg-muted
                              "
                            >
                              {draftDueDate
                                ? format(draftDueDate, 'MMM dd, yyyy')
                                : 'Pick date'}
                            </Button>
                          </PopoverTrigger>

                          <PopoverContent
                            className="
                              w-auto
                              p-0
                              bg-card
                              border border-border
                              shadow-xl
                              z-[9999]
                            "
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
                          className="
                            h-9
                            rounded-md
                            bg-card
                            border border-border
                            px-2
                            text-sm
                            shadow-sm
                          "
                        />

                        <Button
                          size="sm"
                          onClick={handleConfirmDueDate}
                          disabled={isUpdatingTicket || !draftDueDate}
                        >
                          Save
                        </Button>
                      </div>
                    ) : (

                    <p>
                      {ticket.due_at
                        ? format(
                            new Date(ticket.due_at),
                            'MMM dd, yyyy'
                          )
                        : 'N/A'}
                    </p>
                  )}
                </div>

                <div className="my-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-border/70 p-3">
                    <p className="text-xs text-muted-foreground">SLA Response Due</p>
                    <p className="mt-1 text-sm font-medium">
                      {ticketSlaQuery.data?.response_due_at
                        ? format(new Date(ticketSlaQuery.data.response_due_at), 'MMM dd, yyyy HH:mm')
                        : 'N/A'}
                    </p>
                    <Badge variant={responseSlaMeta.badge} className="mt-2">
                      {responseSlaMeta.text}
                    </Badge>
                  </div>

                  <div className="rounded-md border border-border/70 p-3">
                    <p className="text-xs text-muted-foreground">SLA Resolution Due</p>
                    <p className="mt-1 text-sm font-medium">
                      {ticketSlaQuery.data?.resolution_due_at
                        ? format(new Date(ticketSlaQuery.data.resolution_due_at), 'MMM dd, yyyy HH:mm')
                        : 'N/A'}
                    </p>
                    <Badge variant={resolutionSlaMeta.badge} className="mt-2">
                      {resolutionSlaMeta.text}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="my-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Attachments</h3>
                    <Badge variant="outline">{attachments.length}</Badge>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
                          className="flex items-center justify-between rounded-md border border-border/70 p-2"
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
                                className="h-10 w-10 shrink-0 overflow-hidden rounded border border-border/70"
                                title="Preview image"
                              >
                                <img
                                  src={attachmentPreviewUrls[attachment.storage_path]}
                                  alt={attachment.file_name}
                                  className="h-full w-full object-cover"
                                />
                              </button>
                            ) : (
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-border/70 text-muted-foreground">
                                <Paperclip className="h-4 w-4" />
                              </span>
                            )}

                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {attachment.file_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
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

                <Separator />

                {/* ===== ACTIVITY TIMELINE ===== */}
                <h3 className="my-4 text-xs font-black uppercase tracking-widest text-slate-400">Activity Log</h3>

                <div className="relative space-y-4 before:absolute before:bottom-0 before:left-[11px] before:top-2 before:w-px before:bg-slate-200 dark:before:bg-slate-800">
                  {timelineItems.map((item) => {
                    if (item.type === 'comment') {
                      const author =
                        item.user_id && authors[item.user_id]
                          ? authors[item.user_id].name ||
                            authors[item.user_id].email
                          : 'User';

                      return (
                        <div key={`c-${item.id}`} className="relative pl-8">
                          <span className="absolute left-0 top-1">💬</span>

                          <p className="text-xs font-bold">
                            {author} commented
                          </p>

                          <p className="mt-1 rounded bg-slate-50 p-2 text-xs text-muted-foreground whitespace-pre-line dark:bg-slate-800">
                            {item.comment_text}
                          </p>

                          <p className="text-xs text-muted-foreground mt-1">
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
                        <span className={`absolute left-0 top-1 ${color}`}>
                          <Icon size={16} />
                        </span>

                        <p className="text-xs font-bold">
                          {text.title}
                          <span className="font-normal text-slate-400">
                            {' '}
                            by {author}
                          </span>
                        </p>

                        {text.description && (
                          <p className="text-sm text-muted-foreground whitespace-pre-line">
                            {text.description}
                          </p>
                        )}

                        <p className="text-xs text-muted-foreground mt-1">
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

                <Separator className="my-6" />

                <Textarea
                  placeholder="Add a comment..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                />

                <Button
                  className="mt-2"
                  onClick={handleAddComment}
                  disabled={!user || isAddingComment}
                >
                  Add Comment
                </Button>
              </>
            )}
          </div>
        </ScrollArea>
        <div className="grid h-16 grid-cols-3 gap-2 border-t border-slate-200 p-3 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            className="h-full flex-col gap-1 rounded-lg text-[10px] font-bold uppercase tracking-wide"
          >
            <UserPlus className="h-4 w-4" />
            Assign
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleEditShortcut}
            className="h-full flex-col gap-1 rounded-lg text-[10px] font-bold uppercase tracking-wide"
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
