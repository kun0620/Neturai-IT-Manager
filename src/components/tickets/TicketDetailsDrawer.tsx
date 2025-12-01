import { useState, useEffect } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useTickets } from '@/hooks/useTickets'; // Import the entire useTickets object
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Tables, Enums } from '@/types/supabase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface TicketDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string | null;
}

export function TicketDetailsDrawer({
  isOpen,
  onClose,
  ticketId,
}: TicketDetailsDrawerProps) {
  const { user } = useAuth();
  // Access hooks from the useTickets object
  const { data: ticket, isLoading: isLoadingTicket } = useTickets.useTicketById(ticketId || '');
  const updateTicketMutation = useTickets.useUpdateTicket();

  const [editMode, setEditMode] = useState(false);
  const [editedStatus, setEditedStatus] = useState<Enums<'ticket_status'>>();
  const [editedPriority, setEditedPriority] = useState<Enums<'ticket_priority'>>();
  const [editedAssignee, setEditedAssignee] = useState<string | null>();

  // Reset state when drawer opens/closes or ticket changes
  useEffect(() => {
    if (ticket) {
      setEditedStatus(ticket.status);
      setEditedPriority(ticket.priority);
      setEditedAssignee(ticket.assigned_to);
    }
    setEditMode(false);
  }, [ticketId, ticket]);

  const getStatusBadgeVariant = (status: Tables<'tickets'>['status']) => {
    switch (status) {
      case 'Open':
        return 'destructive';
      case 'In Progress':
        return 'secondary';
      case 'Closed':
      case 'Resolved':
        return 'default';
      case 'Pending':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const handleUpdateTicket = async () => {
    if (!ticketId || !user?.id || !ticket) return;

    const updates: Partial<Tables<'tickets'>> = {};

    if (editedStatus !== ticket.status) {
      updates.status = editedStatus;
    }
    if (editedPriority !== ticket.priority) {
      updates.priority = editedPriority;
    }
    if (editedAssignee !== ticket.assigned_to) {
      updates.assigned_to = editedAssignee;
    }

    if (Object.keys(updates).length === 0) {
      setEditMode(false);
      return; // No changes to save
    }

    try {
      await updateTicketMutation.mutateAsync({ id: ticketId, updates });
      toast.success('Ticket updated successfully!');
      setEditMode(false);
    } catch (error: any) {
      toast.error(`Failed to update ticket: ${error.message}`);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="h-[90%] mt-24">
        <ScrollArea className="h-full">
          <div className="mx-auto w-full max-w-sm md:max-w-2xl lg:max-w-4xl p-4">
            <DrawerHeader>
              <DrawerTitle>Ticket Details</DrawerTitle>
              <DrawerDescription>
                View and manage the selected ticket.
              </DrawerDescription>
            </DrawerHeader>

            {isLoadingTicket ? (
              <div className="space-y-4 p-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
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
                  <Button
                    variant="outline"
                    onClick={() => setEditMode(!editMode)}
                    disabled={updateTicketMutation.isPending}
                  >
                    {editMode ? 'Cancel Edit' : 'Edit'}
                  </Button>
                </div>

                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="grid w-full grid-cols-1">
                    <TabsTrigger value="details">Details</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="mt-4">
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
                          <p className="text-base">{ticket.category_id || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Status
                          </p>
                          {editMode ? (
                            <Select
                              value={editedStatus}
                              onValueChange={(value: Enums<'ticket_status'>) =>
                                setEditedStatus(value)
                              }
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                {['Open', 'In Progress', 'Closed', 'Resolved'].map(
                                  (status) => (
                                    <SelectItem key={status} value={status}>
                                      {status}
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant={getStatusBadgeVariant(ticket.status)}>
                              {ticket.status}
                            </Badge>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Priority
                          </p>
                          {editMode ? (
                            <Select
                              value={editedPriority}
                              onValueChange={(value: Enums<'ticket_priority'>) =>
                                setEditedPriority(value)
                              }
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                              <SelectContent>
                                {['Low', 'Medium', 'High', 'Critical'].map((prio) => (
                                  <SelectItem key={prio} value={prio}>
                                    {prio}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="text-base">{ticket.priority}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Assignee
                          </p>
                          {editMode ? (
                            <Input
                              value={editedAssignee || ''}
                              onChange={(e) => setEditedAssignee(e.target.value || null)}
                              placeholder="Assignee ID"
                            />
                          ) : (
                            <p className="text-base">{ticket.assigned_to || 'Unassigned'}</p>
                          )}
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
                      </div>
                      {editMode && (
                        <Button
                          onClick={handleUpdateTicket}
                          disabled={updateTicketMutation.isPending}
                          className="mt-4"
                        >
                          {updateTicketMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Save Changes
                        </Button>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <p className="text-center text-muted-foreground p-4">
                Ticket not found.
              </p>
            )}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
