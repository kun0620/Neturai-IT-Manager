import { useState } from 'react';
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
import { notifyError, notifySuccess } from '@/lib/notify';
import { Loader2 } from 'lucide-react';

import type { Tables } from '@/types/database.types';

interface CreateTicketDialogProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Tables<'ticket_categories'>[];
}

export function CreateTicketDialog({
  isOpen,
  onClose,
  categories,
}: CreateTicketDialogProps) {
  const { useCreateTicket } = useTickets;
  const createTicketMutation = useCreateTicket();

  /* ---------------- State ---------------- */

  const [step, setStep] = useState<1 | 2>(1);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>(
    categories[0]?.id ?? ''
  );
  const [priority, setPriority] = useState<string>('Low');

  /* ---------------- Load priorities ---------------- */

  const { data: priorities = [] } = useQuery({
    queryKey: ['ticket_priorities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_priorities')
        .select('id, name');

      if (error) throw error;

      // ✅ เรียงเอง: ต่ำ → สูง
      const order = ['Low', 'Medium', 'High', 'Critical'];

      return (data ?? []).sort(
        (a, b) => order.indexOf(a.name) - order.indexOf(b.name)
      );
    },
  });

  /* ---------------- Helpers ---------------- */

  const resetForm = () => {
    setStep(1);
    setSubject('');
    setDescription('');
    setCategoryId(categories[0]?.id ?? '');
    setPriority('Low');
  };
  
  const handleNext = () => {
    if (!subject.trim()) {
      notifyError('Subject is required');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        notifyError('You must be logged in');
        return;
      }

      if (!categoryId) {
        notifyError('Please select a category');
        return;
      }

      if (!priority) {
        notifyError('Please select a priority');
        return;
      }

      await createTicketMutation.mutateAsync({
        user_id: user.id,
        subject,
        description,
        category_id: categoryId,
        priority,
        status: 'open',
      });

      notifySuccess('Ticket created successfully');
      resetForm();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create ticket';
      notifyError(message);
    }
  };

  /* ---------------- Render ---------------- */

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Create New Ticket</DialogTitle>
          <DialogDescription>
            Fill in the details to create a support ticket.
          </DialogDescription>
        </DialogHeader>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of the issue"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed explanation of the problem"
                rows={5}
              />
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p.id} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          {step === 2 && (
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
          )}

          {step === 1 ? (
            <Button onClick={handleNext}>Next</Button>
          ) : (
            <Button
              onClick={handleSubmit}
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
