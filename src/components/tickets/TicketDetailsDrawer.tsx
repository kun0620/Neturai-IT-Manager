import { useState, useEffect } from 'react';
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
import { format } from 'date-fns';
import { useTickets } from '@/hooks/useTickets';
import { Skeleton } from '@/components/ui/skeleton';
import { TICKET_STATUS_OPTIONS } from '@/constants/enums'; // Import runtime enum values
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useUsersForAssignment } from '@/hooks/useUsers'; // Import useUsersForAssignment
import { useCurrentProfile } from '@/hooks/useCurrentProfile';
import type { Database, Enums } from '@/types/database.types';

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
    useUserById,
    useTicketComments,
    useAddTicketComment,
    useCommentAuthors,
    useUpdateTicket,
    useTicketHistory,
    useHistoryAuthors,
  } = useTickets;
const { canManageTickets, loading: roleLoading } = useCurrentProfile();

  const { session } = useAuth();
  const user = session?.user;


  const {
    data: ticket,
    isLoading: isLoadingTicket,
    error: ticketError,
    refetch: refetchTicket,
  } = useTicketById(ticketId || '');

  const {
    data: createdByUser,
    isLoading: isLoadingCreatedBy,
    error: createdByError,
    refetch: refetchCreatedBy,
  } = useUserById(ticket?.created_by || null);

  const {
    data: assignedToUser,
    isLoading: isLoadingAssignedTo,
    error: assignedToError,
    refetch: refetchAssignedTo,
  } = useUserById(ticket?.assigned_to || null);

  const {
    data: comments,
    isLoading: isLoadingComments,
    error: commentsError,
    refetch: refetchComments,
  } = useTicketComments(ticketId || '');

  const {
    data: commentAuthors,
    isLoading: isLoadingCommentAuthors,
    error: commentAuthorsError,
  } = useCommentAuthors(comments);

  const {
    data: history,
    isLoading: isLoadingHistory,
    error: historyError,
    refetch: refetchHistory,
  } = useTicketHistory(ticketId || '');

  const {
    data: historyAuthors,
    isLoading: isLoadingHistoryAuthors,
    error: historyAuthorsError,
  } = useHistoryAuthors(history);

  const {
    data: assignableUsers,
    isLoading: isLoadingAssignableUsers,
    error: assignableUsersError,
  } = useUsersForAssignment(); // Fetch all users for assignment

  const { mutate: addComment, isPending: isAddingComment } = useAddTicketComment();
  const { mutate: updateTicket, isPending: isUpdatingTicket } = useUpdateTicket();

  const [newCommentText, setNewCommentText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<Enums<'ticket_status'> | undefined>(
    ticket?.status
  );
  const [selectedAssignee, setSelectedAssignee] = useState<string | null | undefined>(
    ticket?.assigned_to
  );

  // Update selectedStatus and selectedAssignee when ticket data changes
  useEffect(() => {
    if (ticket?.status && selectedStatus !== ticket.status) {
      setSelectedStatus(ticket.status);
    }
    if (ticket?.assigned_to !== undefined && selectedAssignee !== ticket.assigned_to) {
      setSelectedAssignee(ticket.assigned_to);
    }
  }, [ticket?.status, ticket?.assigned_to]);

  const handleAddComment = () => {
    if (newCommentText.trim() && ticketId && user?.id) {
      addComment(
        {
          ticket_id: ticketId,
          user_id: user.id,
          comment_text: newCommentText.trim(),
        },
        {
          onSuccess: () => {
            setNewCommentText('');
            toast.success('Comment added successfully!');
          },
          onError: (err) => {
            toast.error(`Failed to add comment: ${err.message}`);
          },
        }
      );
    }
  };

  const handleStatusChange = (newStatus: Enums<'ticket_status'>) => {
    if (ticketId && user?.id && newStatus !== ticket?.status) {
      updateTicket(
        {
          id: ticketId,
          updates: { status: newStatus },
          userId: user.id,
        },
        {
          onSuccess: () => {
            setSelectedStatus(newStatus);
            toast.success(`Ticket status updated to ${newStatus}`);
          },
          onError: (err) => {
            toast.error(`Failed to update status: ${err.message}`);
          },
        }
      );
    }
  };

  const handleAssigneeChange = (newAssigneeId: string) => {
    // Convert "unassigned" string to null for database
    const assigneeToUpdate = newAssigneeId === 'unassigned' ? null : newAssigneeId;

    if (ticketId && user?.id && assigneeToUpdate !== ticket?.assigned_to) {
      updateTicket(
        {
          id: ticketId,
          updates: { assigned_to: assigneeToUpdate },
          userId: user.id,
        },
        {
          onSuccess: () => {
            setSelectedAssignee(assigneeToUpdate);
            toast.success(
              `Ticket assigned to ${
                assignableUsers?.find((u) => u.id === assigneeToUpdate)?.name ||
                'Unassigned'
              }`
            );
          },
          onError: (err) => {
            toast.error(`Failed to assign ticket: ${err.message}`);
          },
        }
      );
    }
  };

  const handleRetry = () => {
    refetchTicket();
    refetchCreatedBy();
    refetchAssignedTo();
    refetchComments();
    refetchHistory();
    // useCommentAuthors and useHistoryAuthors will refetch automatically when comments/history change
  };

  const getCategoryName = (categoryId: string | null) => {
    return categories.find((cat) => cat.id === categoryId)?.name || 'N/A';
  };

  const getStatusBadgeVariant = (status: Ticket['status']) => {
  switch (status) {
    case 'Open':
      return 'destructive';
    case 'In Progress':
      return 'secondary';
    case 'Closed':
    case 'Resolved':
      return 'default';
    default:
      return 'outline';
  }
};

const getPriorityBadgeVariant = (priority: Ticket['priority']) => {
  switch (priority) {
    case 'Low':
      return 'outline';
    case 'Medium':
      return 'secondary';
    case 'High':
      return 'default';
    case 'Critical':
      return 'destructive';
    default:
      return 'outline';
  }
};


  const isLoadingAny =
    isLoadingTicket ||
    isLoadingCreatedBy ||
    isLoadingAssignedTo ||
    isLoadingComments ||
    isLoadingCommentAuthors ||
    isLoadingHistory ||
    isLoadingHistoryAuthors ||
    isLoadingAssignableUsers;
  const hasError =
    ticketError ||
    createdByError ||
    assignedToError ||
    commentsError ||
    commentAuthorsError ||
    historyError ||
    historyAuthorsError ||
    assignableUsersError;

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="h-[90%] mt-24">
        <ScrollArea className="h-full">
          <div className="mx-auto w-full max-w-sm md:max-w-2xl lg:max-w-4xl p-4">
            <DrawerHeader>
              <DrawerTitle>Ticket Details</DrawerTitle>
              <DrawerDescription>
                View the selected ticket's information and comments.
              </DrawerDescription>
            </DrawerHeader>

            {isLoadingAny ? (
              <div className="space-y-4 p-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Separator className="my-4" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : hasError ? (
              <div className="p-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    Failed to load ticket details.{' '}
                    {ticketError?.message ||
                      createdByError?.message ||
                      assignedToError?.message ||
                      commentsError?.message ||
                      commentAuthorsError?.message ||
                      historyError?.message ||
                      historyAuthorsError?.message ||
                      assignableUsersError?.message ||
                      'Please try again.'}
                  </AlertDescription>
                </Alert>
                <Button onClick={handleRetry} className="mt-4">
                  Retry
                </Button>
              </div>
            ) : ticket ? (
              <div className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-2xl font-bold">{ticket.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Ticket ID: {ticket.id.substring(0, 8)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Description
                    </p>
                    <p className="text-base">{ticket.description || 'N/A'}</p>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Category
                      </p>
                      <p className="text-base">
                        {getCategoryName(ticket.category_id)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Status
                      </p>
                      <Select
  value={selectedStatus}
  onValueChange={(value) =>
    handleStatusChange(value as Enums<'ticket_status'>)
  }
  disabled={roleLoading || isUpdatingTicket || !canManageTickets}
>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Select Status" />
  </SelectTrigger>
  <SelectContent>
    {TICKET_STATUS_OPTIONS.map((statusOption) => (
      <SelectItem key={statusOption} value={statusOption}>
        {statusOption}
      </SelectItem>
    ))}
  </SelectContent>
</Select>

{!canManageTickets && !roleLoading && (
  <p className="text-xs text-muted-foreground mt-1">
    You don’t have permission to change status.
  </p>
)}


                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Priority
                      </p>
                      <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Assignee
                      </p>
<Select
  value={selectedAssignee || 'unassigned'}
  onValueChange={handleAssigneeChange}
  disabled={
    roleLoading ||
    isUpdatingTicket ||
    isLoadingAssignableUsers ||
    !canManageTickets
  }
>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Select Assignee" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="unassigned">Unassigned</SelectItem>
    {assignableUsers?.map((assignee) => (
      <SelectItem key={assignee.id} value={assignee.id}>
        {assignee.name || assignee.email}
      </SelectItem>
    ))}
  </SelectContent>
</Select>

{!canManageTickets && !roleLoading && (
  <p className="text-xs text-muted-foreground mt-1">
    You don’t have permission to assign tickets.
  </p>
)}

                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Created By
                      </p>
                      <p className="text-base">
                        {createdByUser?.name || createdByUser?.email || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Created At
                      </p>
                      <p className="text-base">
                        {ticket.created_at
                          ? format(new Date(ticket.created_at), 'MMM dd, yyyy HH:mm')
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Last Updated
                      </p>
                      <p className="text-base">
                        {ticket.updated_at
                          ? format(new Date(ticket.updated_at), 'MMM dd, yyyy HH:mm')
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Resolved At
                      </p>
                      <p className="text-base">
                        {ticket.resolved_at
                          ? format(new Date(ticket.resolved_at), 'MMM dd, yyyy HH:mm')
                          : 'N/A'}
                      </p>
                    </div>
                    {/* Attachment Link and Location are not in the current schema, omitting for now */}
                  </div>

                  <Separator className="my-4" />

                  {/* Comments Section */}
                  <div>
                    <h4 className="text-lg font-semibold mb-2">Comments</h4>
                    {isLoadingComments || isLoadingCommentAuthors ? (
                      <div className="space-y-2">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ) : comments && comments.length > 0 ? (
                      <div className="space-y-4">
                        {comments.map((comment) => {
                          const userId = comment.user_id;
                          const safeUserId =
                            typeof userId === 'string' && userId.length > 0
                              ? userId
                              : 'unknown';
                          const userInitials = safeUserId
                            .substring(0, Math.min(safeUserId.length, 2))
                            .toUpperCase();
                          const author = commentAuthors?.[safeUserId]; // Use optional chaining for commentAuthors

                          return (
                            <div
                              key={comment.id}
                              className="flex items-start space-x-3"
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${safeUserId}`}
                                />
                                <AvatarFallback>{userInitials}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium">
                                    {author?.name || author?.email || 'Unknown User'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(
                                      new Date(comment.created_at),
                                      'MMM dd, yyyy HH:mm'
                                    )}
                                  </p>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {comment.comment_text}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No comments yet.</p>
                    )}

                    <div className="mt-6">
                      <Textarea
                        placeholder="Add a comment..."
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        className="mb-2"
                      />
                      <Button
                        onClick={handleAddComment}
                        disabled={!newCommentText.trim() || isAddingComment || !user?.id}
                      >
                        {isAddingComment ? 'Adding...' : 'Add Comment'}
                      </Button>
                      {!user?.id && (
                        <p className="text-sm text-red-500 mt-2">
                          You must be logged in to add comments.
                        </p>
                      )}
                    </div>
                  </div>

                  <Separator className="my-4" />

                  {/* History Section */}
                  <div>
                    <h4 className="text-lg font-semibold mb-2">History</h4>
                    {isLoadingHistory || isLoadingHistoryAuthors ? (
                      <div className="space-y-2">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ) : history && history.length > 0 ? (
                      <div className="space-y-4">
                        {history.map((entry) => {
                          const userId = entry.user_id;
                          const safeUserId =
                            typeof userId === 'string' && userId.length > 0
                              ? userId
                              : 'unknown';
                          const userInitials = safeUserId
                            .substring(0, Math.min(safeUserId.length, 2))
                            .toUpperCase();
                          const author = historyAuthors?.[safeUserId];

                          let historyMessage = '';
                          if (entry.change_type === 'status_change') {
                            historyMessage = `Changed status from "${entry.old_value || 'N/A'}" to "${
                              entry.new_value || 'N/A'
                            }"`;
                          } else if (entry.change_type === 'assigned_to_change') {
                            const oldAssigneeName =
                              assignableUsers?.find((u) => u.id === entry.old_value)?.name ||
                              'Unassigned';
                            const newAssigneeName =
                              assignableUsers?.find((u) => u.id === entry.new_value)?.name ||
                              'Unassigned';
                            historyMessage = `Changed assignee from "${oldAssigneeName}" to "${newAssigneeName}"`;
                          } else {
                            historyMessage = `Changed ${entry.change_type}: ${
                              entry.old_value || 'N/A'
                            } -> ${entry.new_value || 'N/A'}`;
                          }

                          return (
                            <div
                              key={entry.id}
                              className="flex items-start space-x-3"
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${safeUserId}`}
                                />
                                <AvatarFallback>{userInitials}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium">
                                    {author?.name || author?.email || 'Unknown User'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(
                                      new Date(entry.created_at),
                                      'MMM dd, yyyy HH:mm'
                                    )}
                                  </p>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {historyMessage}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No history yet.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground p-4">Ticket not found.</p>
            )}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
  
}
