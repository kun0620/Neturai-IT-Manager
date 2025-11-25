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
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Enums, Tables } from '@/types/database.types'; // Import Tables for category type

interface CreateTicketDialogProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Tables<'ticket_categories'>[]; // Accept categories as prop
}

export function CreateTicketDialog({ isOpen, onClose, categories }: CreateTicketDialogProps) {
  const { user } = useAuth();
  // Destructure useCreateTicket from the useTickets object
  const { useCreateTicket } = useTickets;
  const createTicketMutation = useCreateTicket();

  const [step, setStep] = useState(1);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>(categories[0]?.name || ''); // Use category name
  const [priority, setPriority] = useState<Enums<'ticket_priority'>>('Low');
  const [assignee, setAssignee] = useState('');

  // Set initial category if categories are loaded
  useState(() => {
    if (categories.length > 0 && !selectedCategoryName) {
      setSelectedCategoryName(categories[0].name);
    }
  });

  const resetForm = () => {
    setStep(1);
    setSubject('');
    setDescription('');
    setSelectedCategoryName(categories[0]?.name || '');
    setPriority('Low');
    setAssignee('');
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

    const selectedCategory = categories.find(cat => cat.name === selectedCategoryName);
    if (!selectedCategory) {
      toast.error('Please select a valid category.');
      return;
    }

    try {
      await createTicketMutation.mutateAsync({
        user_id: user.id,
        subject,
        description,
        category_id: selectedCategory.id, // Pass category_id
        priority,
        assignee: assignee || null,
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
                value={selectedCategoryName}
                onValueChange={(value: string) => setSelectedCategoryName(value)}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
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
              <Input
                id="assignee"
                placeholder="Name of the person assigned"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              />
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
