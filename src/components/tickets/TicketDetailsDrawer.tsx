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

type Ticket = Database['public']['Tables']['tickets']['Row'];
type TicketCategory = Database['public']['Tables']['ticket_categories']['Row'];

interface TicketDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string | null;
  categories: TicketCategory[];
}

export function TicketDetailsDrawer({
  isOpen,
  onClose,
  ticketId,
  categories,
}: TicketDetailsDrawerProps) {
  const {
    useTicketById,
    useUpdateTicket,
    useTicketComments,
    useAddTicketComment,
    useTicketHistory,
    useHistoryAuthors,
  } = useTickets;


  const historyQuery = ticketId
  ? useTicketHistory(ticketId)
  : null;

  const history = historyQuery?.data;
  const isLoadingHistory = historyQuery?.isLoading;
  const historyAuthorsQuery = useHistoryAuthors(history);
  const historyAuthors = historyAuthorsQuery.data ?? {};
  const { session } = useAuth();
  const { role, loading: roleLoading } = useCurrentProfile();
  const { data: itUsers, isLoading: isLoadingITUsers } = useITUsers();
  const user = session?.user;
  const isStaff = role === 'admin' || role === 'it';

  const canAssign = isStaff;
  const canChangeStatus = isStaff;
  const canManageTickets = isStaff;
  const canComment = role !== null;

  const itUserMap = new Map(
  (itUsers ?? []).map(u => [u.id, u.name ?? u.id])
);
  console.log('history:', history);
console.log('historyAuthors:', historyAuthors);


  /* ---------------- data ---------------- */

  const ticketQuery = ticketId ? useTicketById(ticketId) : null;
  const commentsQuery = ticketId ? useTicketComments(ticketId) : null;
  const ticket = ticketQuery?.data;
  const isLoadingTicket = ticketQuery?.isLoading;
  const ticketError = ticketQuery?.error;

  const comments = commentsQuery?.data;
  const isLoadingComments = commentsQuery?.isLoading;

  const { mutate: updateTicket, isPending: isUpdatingTicket } =
    useUpdateTicket();

  const { mutate: addComment, isPending: isAddingComment } =
    useAddTicketComment();

  /* ---------------- state ---------------- */

  const [newCommentText, setNewCommentText] = useState('');
  const [selectedStatus, setSelectedStatus] =
  useState<Ticket['status'] | ''>('');

  useEffect(() => {
  if (ticket?.status) {
    setSelectedStatus(ticket.status);
  }
}, [ticket?.status]);

useEffect(() => {
  if (ticket?.assigned_to) {
    setAssignedUser(ticket.assigned_to);
  } else {
    setAssignedUser('');
  }
}, [ticket?.assigned_to]);

  /* ---------------- handlers ---------------- */

  const handleStatusChange = (status: Ticket['status']) => {
    if (!ticketId || !user?.id) return;

    updateTicket(
      {
        id: ticketId,
        updates: { status },
        userId: user.id,
      },
      {
        onSuccess: () => {
          toast.success('Status updated');
        },
        onError: (err) => {
          toast.error(err.message);
        },
      }
    );
  };

  const [assignedUser, setAssignedUser] = useState<string>('');
  const handleAssignUser = (userId: string) => {
  if (!ticketId || !user?.id) return;
    
  setAssignedUser(userId);

  updateTicket(
    {
      id: ticketId,
      updates: { assigned_to: userId },
      userId: user.id,
    },
    {
      onSuccess: () => {
        toast.success('Ticket assigned');
    },
      onError: (err) => {
        toast.error(err.message);
      },
      }
    );
  };


  const handleAddComment = () => {
    if (!ticketId || !user?.id || !newCommentText.trim()) return;

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
        onError: (err) => {
          toast.error(err.message);
        },
      }
    );
  };

  /* ---------------- helpers ---------------- */

  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  const getCategoryName = (categoryId: string | null) =>
    categoryId ? categoryMap.get(categoryId) ?? 'N/A' : 'N/A';

  const getPriorityBadgeVariant = (priority: Ticket['priority']) => {
    switch (priority) {
      case 'Low':
        return 'outline';
      case 'Medium':
        return 'secondary';
      case 'High':
      case 'Critical':
        return 'destructive';
      default:
        return 'outline';
    }
  };
  const getUserStatusMessage = (status: Ticket['status']) => {
    switch (status) {
      case 'Open':
        return 'Your ticket has been received.';
      case 'In Progress':
        return 'Our IT team is currently working on your ticket.';
      case 'Resolved':
        return 'Waiting for your response.';
      case 'Closed':
        return 'This ticket has been resolved.';
      default:
        return '';
    }
  };


  const assignableUsers = itUsers ?? [];

  let assignedToSection: React.ReactNode;

if (!user) {
  assignedToSection = <p>{ticket?.assigned_to || 'Unassigned'}</p>;
} else if (isLoadingITUsers) {
  assignedToSection = (
    <p className="text-sm text-muted-foreground">Loading IT users...</p>
  );
} else {
  assignedToSection = (
    <Select
      value={assignedUser}
      onValueChange={handleAssignUser}
      disabled={isUpdatingTicket}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Unassigned" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">Unassigned</SelectItem>
        {assignableUsers.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {u.name || u.id}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

  /* ---------------- render ---------------- */

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
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
                {/* header */}
                <h2 className="text-xl font-bold mb-2">{ticket.title}</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Ticket ID: {ticket.id.slice(0, 8)}
                </p>

                <Separator />
                  {role === 'user' && (
                    <div className="mt-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
                      {getUserStatusMessage(ticket.status)}
                    </div>
                  )}

                {/* info */}
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
                    <p className="text-sm text-muted-foreground">Priority</p>
                    <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Select
                       value={selectedStatus}
                        onValueChange={(v) => handleStatusChange(v as Ticket['status'])}
                        disabled={!canChangeStatus || isUpdatingTicket}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="In Progress">
                          In Progress
                        </SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Created At</p>
                    <p>
                      {ticket.created_at
                        ? format(
                            new Date(ticket.created_at),
                            'MMM dd, yyyy HH:mm'
                          )
                        : 'N/A'}
                    </p>
                  </div>
                  {role !== 'user' && (
                  <div>
                    <p className="text-sm text-muted-foreground">Assigned To</p>
                    {canAssign ? (
                    assignedToSection
                  ) : (
                    <p>
                    {ticket.assigned_to
                      ? itUserMap.get(ticket.assigned_to) ?? ticket.assigned_to
                      : 'Unassigned'}
                  </p>
                  )}
                  </div>
                  )}


                </div>
                <Separator className="my-6" />

                <h3 className="font-semibold mb-2">History</h3>

                {isLoadingHistory ? (
                  <Skeleton className="h-20 w-full" />
                ) : history && history.length > 0 ? (
                  <div className="space-y-3">
                    {history.map((h) => {
                      const author = h.user_id
                        ? historyAuthors[h.user_id]
                        : null;

                      return (
                        <div key={h.id} className="text-sm">
                          <p className="text-muted-foreground">
                            {format(new Date(h.created_at), 'MMM dd, yyyy HH:mm')}
                          </p>

                          <p>
                            {h.change_type === 'status_change' && (
                              <>
                                Status changed from <b>{h.old_value}</b> →{' '}
                                <b>{h.new_value}</b>
                              </>
                            )}

                            {h.change_type === 'assigned_to_change' && (
                                <>
                                  Assigned changed from{' '}
                                  <b>{itUserMap.get(h.old_value ?? '') || 'Unassigned'}</b> →{' '}
                                  <b>{itUserMap.get(h.new_value ?? '') || 'Unassigned'}</b>
                                </>
                              )}
                          </p>

                          {author && canManageTickets && (
                            <div className="text-xs text-muted-foreground mt-1">
                              by {author.name || author.email}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No history yet.
                  </p>
                )}

                <Separator className="my-4" />

                {/* comments */}
                <h3 className="font-semibold mb-2">Comments</h3>

                {isLoadingComments ? (
                  <Skeleton className="h-20 w-full" />
                ) : comments && comments.length > 0 ? (
                  <div className="space-y-3 mb-4">
                    {comments.map((c) => (
                      <div key={c.id} className="text-sm">
                        <p className="text-muted-foreground">
                          {format(
                            new Date(c.created_at),
                            'MMM dd, yyyy HH:mm'
                          )}
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
                  disabled={!canComment || isAddingComment || !newCommentText.trim()}
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
