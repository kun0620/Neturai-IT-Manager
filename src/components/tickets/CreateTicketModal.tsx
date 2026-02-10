import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
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
import { useAuth } from '@/hooks/useAuth';
import { notifyError, notifySuccess } from '@/lib/notify';
import { Loader2 } from 'lucide-react';
import { Enums } from '@/types/database.types';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateTicketModal({ isOpen, onClose }: CreateTicketModalProps) {
  const { user } = useAuth();
  const { useCreateTicket, useTicketCategories } = useTickets;
  const createTicketMutation = useCreateTicket();
  const { data: categories = [] } = useTicketCategories();

  const [step, setStep] = useState(1);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [priority, setPriority] =
    useState<Enums<'ticket_priority_enum'>>('Low');

  const { data: priorities = [] } = useQuery({
    queryKey: ['ticket_priorities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_priorities')
        .select('id, name');

      if (error) throw error;

      const order = ['Low', 'Medium', 'High', 'Critical'];
      return (data ?? []).sort(
        (a, b) => order.indexOf(a.name) - order.indexOf(b.name)
      );
    },
  });

  useEffect(() => {
    if (!categoryId && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  const resetForm = () => {
    setStep(1);
    setSubject('');
    setDescription('');
    setCategoryId(categories[0]?.id ?? '');
    setPriority('Low');
  };

  const handleNext = () => {
    if (step === 1 && !subject.trim()) {
      notifyError('Subject cannot be empty.');
      return;
    }
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      notifyError('You must be logged in to create a ticket.');
      return;
    }

    if (!categoryId) {
      notifyError('Please select a category.');
      return;
    }

    try {
      await createTicketMutation.mutateAsync({
        user_id: user.id,
        subject,
        description,
        category_id: categoryId,
        priority,
        status: 'open', // Default status for new tickets
      });
      notifySuccess('Ticket created successfully!');
      onClose();
      resetForm();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to create ticket';
      notifyError('Failed to create ticket', message);
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
              value={categoryId}
              onValueChange={(value: string) => setCategoryId(value)}
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
              onValueChange={(value: Enums<'ticket_priority_enum'>) =>
                setPriority(value)
              }
            >
              <SelectTrigger id="priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {priorities.map((prio) => (
                  <SelectItem key={prio.id} value={prio.name}>
                    {prio.name}
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
            <Button onClick={handleNext} className="btn-motion-primary">Next</Button>
          ) : (
            <Button
              onClick={handleSubmit}
              className="btn-motion-primary"
              disabled={createTicketMutation.isPending}
            >
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
