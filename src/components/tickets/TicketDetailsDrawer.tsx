import { Calendar } from '@/components/ui/calendar';
import { Clock, User, ArrowRightLeft } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useEffect, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { format } from 'date-fns';
import { toast } from 'sonner';

import { useTickets } from '@/hooks/useTickets';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentProfile } from '@/hooks/useCurrentProfile';
import type { Database } from '@/types/database.types';
import { useTicketDrawer } from '@/context/TicketDrawerContext';

type Ticket = Database['public']['Tables']['tickets']['Row'];
type TicketCategory = Database['public']['Tables']['ticket_categories']['Row'];

interface TicketDetailsDrawerProps {
  categories: TicketCategory[];
}

export function TicketDetailsDrawer({ categories }: TicketDetailsDrawerProps) {
  /* ================= Drawer Context ================= */
  const { ticketId, isOpen, closeDrawer } = useTicketDrawer();

  if (!ticketId) return null;

  /* ================= hooks ================= */
  const {
    useTicketById,
    useUpdateTicket,
    useTicketComments,
    useAddTicketComment,
    useTicketHistory,
    useHistoryAuthors,
  } = useTickets;

  const ticketQuery = useTicketById(ticketId);
  const commentsQuery = useTicketComments(ticketId);
  const historyQuery = useTicketHistory(ticketId);

  const ticket = ticketQuery.data;
  const comments = commentsQuery.data ?? [];
  const history = historyQuery.data ?? [];

  const isLoadingTicket = ticketQuery.isLoading;
  const isLoadingComments = commentsQuery.isLoading;
  const isLoadingHistory = historyQuery.isLoading;
  const ticketError = ticketQuery.error;

  const historyAuthorsQuery = useHistoryAuthors(history);
  const historyAuthors = historyAuthorsQuery.data ?? {};

  const { mutate: updateTicket, isPending: isUpdatingTicket } =
    useUpdateTicket();
  const { mutate: addComment, isPending: isAddingComment } =
    useAddTicketComment();

  const { session } = useAuth();
  const { role } = useCurrentProfile();
  const { data: itUsers, isLoading: isLoadingITUsers } = useITUsers();

  const user = session?.user;
  const isStaff = role === 'admin' || role === 'it';

  const canAssign = isStaff;
  const canChangeStatus = isStaff;
  const canManageTickets = isStaff;
  const canComment = role !== null;

  /* ================= state ================= */
  const [newCommentText, setNewCommentText] = useState('');
  const [selectedStatus, setSelectedStatus] =
    useState<Ticket['status'] | ''>('');
  const [assignedUser, setAssignedUser] = useState<string>('');
  const [draftDueDate, setDraftDueDate] = useState<Date | undefined>();
  const [draftDueTime, setDraftDueTime] = useState('09:00');

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

  /* ================= handlers ================= */
  const handleStatusChange = (status: Ticket['status']) => {
    if (!user?.id) return;

    updateTicket(
      { id: ticketId, updates: { status }, userId: user.id },
      {
        onSuccess: () => toast.success('Status updated'),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleAssignUser = (userId: string) => {
    if (!user?.id) return;

    setAssignedUser(userId);

    updateTicket(
      { id: ticketId, updates: { assigned_to: userId }, userId: user.id },
      {
        onSuccess: () => toast.success('Ticket assigned'),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleAddComment = () => {
    if (!user?.id || !newCommentText.trim()) return;

    addComment(
      {
        ticket_id: ticketId,
        user_id: user.id,
        comment_text: newCommentText.trim(),
      },
      {
        onSuccess: () => {
          setNewCommentText('');
          toast.success('Comment added');
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleConfirmDueDate = () => {
    if (!ticket || !user?.id || !draftDueDate) return;

    const [h, m] = draftDueTime.split(':').map(Number);
    const due = new Date(draftDueDate);
    due.setHours(h);
    due.setMinutes(m);
    due.setSeconds(0);

    updateTicket(
      {
        id: ticket.id,
        updates: { due_at: due.toISOString() },
        userId: user.id,
      },
      {
        onSuccess: () => toast.success('Due date updated'),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  /* ================= helpers ================= */
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
  const getCategoryName = (id: string | null) =>
    id ? categoryMap.get(id) ?? 'N/A' : 'N/A';

  const isOverdue =
    !!ticket?.due_at &&
    new Date(ticket.due_at).getTime() < Date.now() &&
    ticket.status !== 'closed';

  const itUserMap = new Map(
    (itUsers ?? []).map((u) => [u.id, u.name ?? u.id])
  );

  /* ================= render ================= */
  return (
    <Drawer open={isOpen} onOpenChange={(o) => !o && closeDrawer()}>
      <DrawerContent className="h-[90%] mt-24">
        <ScrollArea className="h-full">
          <div className="mx-auto w-full max-w-3xl p-4">
            <DrawerHeader>
              <DrawerTitle>Ticket Details</DrawerTitle>
              <DrawerDescription>
                View the selected ticket&apos;s information and comments.
              </DrawerDescription>
            </DrawerHeader>

            {isLoadingTicket ? (
              <Skeleton className="h-40 w-full" />
            ) : ticketError || !ticket ? (
              <p className="text-center text-muted-foreground">
                Ticket not found
              </p>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                  {ticket.title}
                  {isOverdue && (
                    <Badge variant="destructive">Overdue</Badge>
                  )}
                </h2>

                <Separator />

                {/* ===== BASIC INFO ===== */}
                <div className="grid grid-cols-2 gap-4 my-4">
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
                        ? format(new Date(ticket.created_at), 'MMM dd, yyyy HH:mm')
                        : '—'}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* ===== STATUS & ASSIGN ===== */}
                <div className="grid grid-cols-2 gap-4 my-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Select
                      value={selectedStatus}
                      onValueChange={(v) =>
                        handleStatusChange(v as Ticket['status'])
                      }
                      disabled={!canChangeStatus || isUpdatingTicket}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">
                          In Progress
                        </SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Assigned To</p>
                    {canAssign ? (
                      <Select
                        value={assignedUser}
                        onValueChange={handleAssignUser}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Unassigned</SelectItem>
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

                {/* ===== DUE DATE ===== */}
                <div className="my-4">
                  <p className="text-sm text-muted-foreground mb-1">Due Date</p>
                  {canManageTickets ? (
                    <div className="flex items-center gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm">
                            {draftDueDate
                              ? format(draftDueDate, 'MMM dd, yyyy')
                              : 'Pick date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
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
                        onChange={(e) => setDraftDueTime(e.target.value)}
                        className="
                          h-9
                          rounded-md
                          border
                          bg-background
                          px-2
                          text-sm
                          text-foreground
                          shadow-sm
                          focus:outline-none
                          focus:ring-2
                          focus:ring-ring
                          focus:ring-offset-2
                        "
                      />


                      <Button size="sm" onClick={handleConfirmDueDate}>
                        Save
                      </Button>
                    </div>
                  ) : (
                    <p>{ticket.due_at ? format(new Date(ticket.due_at), 'MMM dd, yyyy') : 'N/A'}</p>
                  )}
                </div>

                <Separator />

                {/* ===== COMMENTS ===== */}
                <h3 className="font-semibold mb-2">Comments</h3>

                {isLoadingComments ? (
                  <Skeleton className="h-20 w-full" />
                ) : comments.length > 0 ? (
                  <div className="space-y-3 mb-4">
                    {comments.map((c) => (
                      <div key={c.id} className="text-sm">
                        <p className="text-muted-foreground">
                          {c.created_at
                            ? format(new Date(c.created_at), 'MMM dd, yyyy HH:mm')
                            : '—'}
                        </p>
                        <p>{c.comment_text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mb-4">
                    No comments yet.
                  </p>
                )}

                <Textarea
                  placeholder="Add a comment..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="mb-2"
                />

                <Button
                  onClick={handleAddComment}
                  disabled={!canComment || isAddingComment}
                >
                  Add Comment
                </Button>
              </>
            )}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
