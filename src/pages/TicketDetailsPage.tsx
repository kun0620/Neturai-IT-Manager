import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, Edit3, MessageSquare, Clock, User, Tag, AlertCircle } from 'lucide-react';

import { useTickets } from '@/hooks/useTickets';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentProfile } from '@/hooks/useCurrentProfile';
import { useITUsers } from '@/hooks/useITUsers';
import { supabase } from '@/lib/supabase';
import { notifyError, notifySuccess } from '@/lib/notify';
import { mapLogToText } from '@/features/logs/mapLogToText';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import EditTicketModal from '@/components/EditTicketModal';
import type { Database } from '@/types/database.types';

type Ticket = Database['public']['Tables']['tickets']['Row'];

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

const formatTicketCode = (ticketId: string | null | undefined) =>
  ticketId ? `#TIC-${ticketId.slice(0, 4).toUpperCase()}` : '#TIC-0000';

export default function TicketDetailsPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { role } = useCurrentProfile();
  const { data: itUsers } = useITUsers();

  const {
    useTicketById,
    useTicketComments,
    useTicketTimeline,
    useLogAuthors,
    useAddTicketComment,
    useUpdateTicket,
    useTicketCategories,
  } = useTickets;

  const ticketQuery = useTicketById(ticketId);
  const commentsQuery = useTicketComments(ticketId);
  const timelineQuery = useTicketTimeline(ticketId);
  const categoriesQuery = useTicketCategories();

  const ticket = ticketQuery.data as Ticket | null | undefined;
  const comments = commentsQuery.data ?? [];
  const timeline = timelineQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];

  const authorsQuery = useLogAuthors(timeline);
  const authors = authorsQuery.data ?? {};

  const ticketSlaQuery = useQuery({
    queryKey: ['ticket-sla-deadlines', ticketId],
    enabled: !!ticketId,
    queryFn: async () => {
      if (!ticketId) return null;
      const { data, error } = await supabase.rpc('calculate_ticket_sla_deadlines', {
        p_ticket_id: ticketId,
      });
      if (error) return null;
      if (!Array.isArray(data) || !data[0]) return null;
      return data[0] as {
        response_due_at: string | null;
        resolution_due_at: string | null;
      };
    },
  });

  const { mutate: addComment, isPending: isAddingComment } = useAddTicketComment();
  const { mutate: updateTicket, isPending: isUpdatingTicket } = useUpdateTicket();

  const [newCommentText, setNewCommentText] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<Ticket['status'] | ''>('');
  const [assignedUser, setAssignedUser] = useState('');
  const [draftDueDate, setDraftDueDate] = useState<Date | undefined>();
  const [draftDueTime, setDraftDueTime] = useState('09:00');

  const user = session?.user;
  const isStaff = role === 'admin' || role === 'it';

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

  const categoryName = categories.find((c) => c.id === ticket?.category_id)?.name ?? '—';
  const assigneeName =
    itUsers?.find((u) => u.id === ticket?.assigned_to)?.name ?? (ticket?.assigned_to ? 'Assigned' : 'Unassigned');

  const itUserOptions = (itUsers ?? []).map((u) => ({ id: u.id, name: u.name }));

  const timelineItems = [
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
  ].sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());

  const handleAddComment = () => {
    if (!user || !ticketId || !newCommentText.trim()) return;
    addComment(
      { ticket_id: ticketId, user_id: user.id, comment_text: newCommentText.trim() },
      {
        onSuccess: () => {
          setNewCommentText('');
          notifySuccess('Comment added');
        },
        onError: (err) => notifyError(err.message),
      }
    );
  };

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
    const normalized = userId || '';
    setAssignedUser(normalized);
    updateTicket(
      { id: ticketId, updates: { assigned_to: normalized || null }, userId: user.id },
      {
        onSuccess: () => notifySuccess('Ticket assigned'),
        onError: (err) => notifyError(err.message),
      }
    );
  };

  const handleConfirmDueDate = () => {
    if (!user || !ticketId || !draftDueDate) return;
    const [h, m] = draftDueTime.split(':').map(Number);
    const due = new Date(draftDueDate);
    due.setHours(h, m, 0, 0);
    updateTicket(
      { id: ticketId, updates: { due_at: due.toISOString() }, userId: user.id },
      {
        onSuccess: () => notifySuccess('Due date saved'),
        onError: (err) => notifyError(err.message),
      }
    );
  };

  if (ticketQuery.isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (ticketQuery.isError || !ticket) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Ticket not found.</p>
        <Button variant="outline" onClick={() => navigate('/tickets')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tickets
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/tickets')}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <span className="font-mono text-sm font-semibold text-primary">
          {formatTicketCode(ticket.id)}
        </span>
      </div>

      {/* Title + Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-2xl font-bold leading-tight">{ticket.title}</h1>
        {isStaff && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditDialogOpen(true)}
            className="shrink-0"
          >
            <Edit3 className="mr-2 h-4 w-4" /> Edit Ticket
          </Button>
        )}
      </div>

      {/* Badges Row */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className={statusBadgeClass(ticket.status)}>
          {ticket.status?.replace('_', ' ') ?? '—'}
        </Badge>
        <Badge variant="outline" className={priorityBadgeClass(ticket.priority)}>
          {ticket.priority ?? '—'}
        </Badge>
        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <Tag className="mr-1 h-3 w-3" />
          {categoryName}
        </Badge>
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 gap-4 rounded-xl border border-primary/10 bg-card p-5 text-sm sm:grid-cols-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Created</p>
          <p className="mt-1 font-medium">
            {ticket.created_at ? format(new Date(ticket.created_at), 'MMM dd, yyyy') : '—'}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Due Date</p>
          <p className="mt-1 font-medium">
            {ticket.due_at ? format(new Date(ticket.due_at), 'MMM dd, yyyy') : '—'}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <User className="mr-1 inline h-3 w-3" />Assignee
          </p>
          <p className="mt-1 font-medium">{assigneeName}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <Clock className="mr-1 inline h-3 w-3" />SLA Resolution
          </p>
          <p className="mt-1 font-medium">
            {ticketSlaQuery.data?.resolution_due_at
              ? format(new Date(ticketSlaQuery.data.resolution_due_at), 'MMM dd HH:mm')
              : '—'}
          </p>
        </div>
      </div>

      {/* Description */}
      {ticket.description && (
        <div className="rounded-xl border border-primary/10 bg-card p-5">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</h2>
          <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{ticket.description}</p>
        </div>
      )}

      {/* Status Change (staff only) */}
      {isStaff && (
        <div className="flex flex-wrap gap-2">
          {(['open', 'in_progress', 'closed'] as Ticket['status'][]).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={selectedStatus === s ? 'default' : 'outline'}
              disabled={isUpdatingTicket || selectedStatus === s}
              onClick={() => handleStatusChange(s as Ticket['status'])}
            >
              {s?.replace('_', ' ')}
            </Button>
          ))}
        </div>
      )}

      {/* Activity Timeline */}
      <div className="rounded-xl border border-primary/10 bg-card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <MessageSquare className="h-4 w-4" /> Activity
          <Badge variant="outline" className="ml-auto rounded-full px-2 text-[11px]">
            {timelineItems.length}
          </Badge>
        </h2>

        <div className="space-y-3">
          {timelineQuery.isLoading || commentsQuery.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : timelineItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            timelineItems.map((item) => {
              const authorName = authors[item.user_id ?? ''] ?? 'System';
              const dateStr = item.created_at
                ? format(new Date(item.created_at), 'MMM dd, yyyy HH:mm')
                : '';

              if (item.type === 'comment') {
                return (
                  <div
                    key={item.id}
                    className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{authorName}</span>
                      <span className="text-[10px] text-muted-foreground">{dateStr}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                      {item.comment_text}
                    </p>
                  </div>
                );
              }

              const logText = mapLogToText(item.action, item.details ?? null);
              return (
                <div key={item.id} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
                  <span>
                    <span className="font-medium text-slate-500">{authorName}</span> {logText.title}
                    {logText.description && (
                      <span className="ml-1 text-slate-400">{logText.description}</span>
                    )}
                    <span className="ml-2 text-[10px]">{dateStr}</span>
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Add Comment */}
        <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Textarea
            placeholder="Add a comment..."
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            rows={3}
            className="resize-none text-sm"
          />
          <Button
            size="sm"
            onClick={handleAddComment}
            disabled={isAddingComment || !newCommentText.trim()}
          >
            Add Comment
          </Button>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditDialogOpen && ticket && (
        <EditTicketModal
          isOpen={isEditDialogOpen}
          onClose={setIsEditDialogOpen}
          isStaff={isStaff}
          isUpdatingTicket={isUpdatingTicket}
          selectedStatus={selectedStatus ?? ''}
          onStatusChange={handleStatusChange}
          assignedUser={assignedUser}
          onAssignUser={handleAssignUser}
          users={itUserOptions}
          draftDueDate={draftDueDate}
          draftDueTime={draftDueTime}
          onDraftDueDateChange={setDraftDueDate}
          onDraftDueTimeChange={setDraftDueTime}
          onSaveDueDate={handleConfirmDueDate}
          currentAssigneeLabel={assigneeName}
          currentDueDateLabel={
            ticket.due_at ? format(new Date(ticket.due_at), 'MMM dd, yyyy') : 'Not set'
          }
        />
      )}
    </div>
  );
}
