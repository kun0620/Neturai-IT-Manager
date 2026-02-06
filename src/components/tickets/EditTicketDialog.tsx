import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTickets } from '@/hooks/useTickets';
import { useUsersForAssignment } from '@/hooks/useUsers'; // Assuming this hook exists for fetching users
import { notifyError, notifySuccess } from '@/lib/notify';
import { Loader2 } from 'lucide-react';
import { Enums, Tables } from '@/types/database.types';

interface EditTicketDialogProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  categories: Tables<'ticket_categories'>[];
}

export function EditTicketDialog({ isOpen, onClose, ticketId, categories }: EditTicketDialogProps) {
  const { useTicketById, useUpdateTicket } = useTickets;
  const { data: ticket, isLoading: isLoadingTicket, error: ticketError } = useTicketById(ticketId);
  const { data: usersForAssignment, isLoading: isLoadingUsers } = useUsersForAssignment();
  const updateTicketMutation = useUpdateTicket();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [priority, setPriority] = useState<Enums<'ticket_priority'>>('Low');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [status, setStatus] = useState<Enums<'ticket_status'>>('Open');

  useEffect(() => {
    if (ticket) {
      setTitle(ticket.title || '');
      setDescription(ticket.description || '');
      setSelectedCategoryId(ticket.category_id || '');
      setPriority(ticket.priority || 'Low');
      setAssigneeId(ticket.assigned_to || null);
      setStatus(ticket.status || 'Open');
    }
  }, [ticket]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      notifyError('Title cannot be empty.');
      return;
    }

    if (!selectedCategoryId) {
      notifyError('Please select a category.');
      return;
    }

    try {
      await updateTicketMutation.mutateAsync({
        id: ticketId,
        updates: {
          title: title.trim(),
          description: description.trim(),
          category_id: selectedCategoryId,
          priority: priority,
          assigned_to: assigneeId,
          status: status,
          updated_at: new Date().toISOString(), // Ensure updated_at is set
        },
      });
      notifySuccess('Ticket updated successfully!');
      onClose();
    } catch (error: any) {
      notifyError('Failed to update ticket', error.message);
    }
  };

  if (isLoadingTicket || isLoadingUsers) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Ticket</DialogTitle>
            <DialogDescription>Loading ticket details...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (ticketError) {
    notifyError('Error loading ticket', ticketError.message);
    onClose();
    return null;
  }

  if (!ticket) {
    notifyError('Ticket not found.');
    onClose();
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Ticket</DialogTitle>
          <DialogDescription>
            Update the details for ticket #{ticketId.substring(0, 8)}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Brief summary of the issue"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Detailed explanation of the problem"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={selectedCategoryId}
              onValueChange={(value: string) => setSelectedCategoryId(value)}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={priority}
              onValueChange={(value: Enums<'ticket_priority'>) => setPriority(value)}
            >
              <SelectTrigger id="priority">
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
          </div>
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={status}
              onValueChange={(value: Enums<'ticket_status'>) => setStatus(value)}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {['Open', 'In Progress', 'Resolved', 'Closed'].map((stat) => (
                  <SelectItem key={stat} value={stat}>
                    {stat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="assignee">Assignee (Optional)</Label>
            <Select
              value={assigneeId || ''}
              onValueChange={(value: string) => setAssigneeId(value === '' ? null : value)}
            >
              <SelectTrigger id="assignee">
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {usersForAssignment?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={updateTicketMutation.isPending}>
            {updateTicketMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
