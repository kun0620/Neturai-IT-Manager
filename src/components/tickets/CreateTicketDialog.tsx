import { useState } from 'react';
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
import { useTickets } from '@/hooks/useTickets'; // Import the single useTickets object
import { useAuth } from '@/context/AuthContext'; // Corrected import path for useAuth
import { useUsersForAssignment } from '@/hooks/useUsers'; // Import for assignee dropdown
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Tables, type Enums } from '@/types/database.types'; // Changed to import type Enums

interface CreateTicketDialogProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Tables<'ticket_categories'>[]; // Accept categories as prop
}

export function CreateTicketDialog({ isOpen, onClose, categories }: CreateTicketDialogProps) {
  const { user } = useAuth();
  const { useCreateTicket } = useTickets;
  const createTicketMutation = useCreateTicket();
  const { data: usersForAssignment, isLoading: isLoadingUsers } = useUsersForAssignment();

  const [step, setStep] = useState(1);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0]?.id || ''); // Use category ID
  const [priority, setPriority] = useState<Enums<'ticket_priority'>>('Low');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);

  // Set initial category if categories are loaded
  useState(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  });

  const resetForm = () => {
    setStep(1);
    setSubject('');
    setDescription('');
    setSelectedCategoryId(categories[0]?.id || '');
    setPriority('Low');
    setAssigneeId(null);
  };

  const handleNext = () => {
    if (step === 1 && !subject.trim()) {
      toast.error('Subject cannot be empty.');
      return;
    }
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to create a ticket.');
      return;
    }

    if (!selectedCategoryId) {
      toast.error('Please select a valid category.');
      return;
    }

    try {
      await createTicketMutation.mutateAsync({
        user_id: user.id,
        subject,
        description,
        category_id: selectedCategoryId, // Pass category_id
        priority,
        assignee: assigneeId,
        status: 'Open', // Default status for new tickets
      });
      toast.success('Ticket created successfully!');
      onClose();
      resetForm();
    } catch (error: any) {
      toast.error(`Failed to create ticket: ${error.message}`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Ticket</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new support ticket.
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Brief summary of the issue"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
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
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 py-4">
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
              <Label htmlFor="assignee">Assignee (Optional)</Label>
              <Select
                value={assigneeId || ''}
                onValueChange={(value: string) => setAssigneeId(value === '' ? null : value)}
                disabled={isLoadingUsers}
              >
                <SelectTrigger id="assignee">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {usersForAssignment?.map((assignee) => (
                    <SelectItem key={assignee.id} value={assignee.id}>
                      {assignee.name || assignee.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          {step > 1 && (
            <Button variant="outline" onClick={handleBack}>
              Back
            </Button>
          )}
          {step < 2 ? (
            <Button onClick={handleNext}>Next</Button>
          ) : (
            <Button onClick={handleSubmit} disabled={createTicketMutation.isPending}>
              {createTicketMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Ticket
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
