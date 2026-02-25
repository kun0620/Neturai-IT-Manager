import { useEffect, useMemo, useState } from 'react';
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
import { useSettings } from '@/hooks/useSettings';
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
  const { data: settings = [] } = useSettings();

  /* ---------------- State ---------------- */

  const [step, setStep] = useState<1 | 2>(1);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>(
    categories[0]?.id ?? ''
  );
  const [priority, setPriority] = useState<string>('Low');
  const [status, setStatus] = useState<'open' | 'in_progress' | 'closed'>('open');

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

  const settingMap = useMemo(
    () => new Map(settings.map((s) => [s.key, s.value ?? ''])),
    [settings]
  );

  const defaultCategoryId = settingMap.get('default_ticket_category_id') ?? '';
  const defaultPriority = settingMap.get('default_ticket_priority') ?? 'Low';
  const defaultStatusRaw = settingMap.get('default_ticket_status') ?? 'open';
  const defaultStatus: 'open' | 'in_progress' | 'closed' =
    defaultStatusRaw === 'in_progress' || defaultStatusRaw === 'closed'
      ? defaultStatusRaw
      : 'open';
  const defaultAssigneeId = settingMap.get('default_assignee_id') ?? '';

  const resetForm = () => {
    setStep(1);
    setSubject('');
    setDescription('');
    setCategoryId(
      categories.some((c) => c.id === defaultCategoryId)
        ? defaultCategoryId
        : (categories[0]?.id ?? '')
    );
    setPriority(defaultPriority);
    setStatus(defaultStatus);
  };

  useEffect(() => {
    if (!isOpen) return;
    resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, categories, defaultCategoryId, defaultPriority, defaultStatus]);
  
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
        status,
        assigned_to: defaultAssigneeId || null,
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
      <DialogContent className="w-[95vw] max-w-xl overflow-hidden rounded-xl border border-slate-200 p-0 dark:border-slate-800 max-sm:h-screen max-sm:w-screen max-sm:max-w-none max-sm:rounded-none">
        <DialogHeader className="border-b border-slate-100 bg-slate-50/70 px-6 py-5 dark:border-slate-800 dark:bg-slate-800/50">
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Create New Ticket
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Fill in the details to create a support ticket.
              </DialogDescription>
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              Step {step} / 2
            </span>
          </div>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-y-auto p-6 max-sm:max-h-[calc(100vh-150px)]">

        {/* STEP 1 */}
        {step === 1 && (
          <div className="grid gap-5">
            <div className="grid gap-1.5">
              <Label htmlFor="subject" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of the issue"
                className="h-11 rounded-lg border-slate-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="description" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed explanation of the problem"
                rows={6}
                className="rounded-lg border-slate-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="grid gap-5">
            <div className="grid gap-1.5">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-11 rounded-lg border-slate-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-800">
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

            <div className="grid gap-1.5">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-11 rounded-lg border-slate-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-800">
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

            <div className="grid gap-1.5">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Status</Label>
              <Select
                value={status}
                onValueChange={(value: 'open' | 'in_progress' | 'closed') =>
                  setStatus(value)
                }
              >
                <SelectTrigger className="h-11 rounded-lg border-slate-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-800">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/30 max-sm:sticky max-sm:bottom-0">
          <div>
            {step === 2 && (
              <Button variant="outline" onClick={() => setStep(1)} className="h-10 rounded-lg border-slate-200 px-5 text-sm font-bold dark:border-slate-700">
                Back
              </Button>
            )}
          </div>

          {step === 1 ? (
            <Button onClick={handleNext} className="btn-motion-primary h-10 rounded-lg px-5 text-sm font-bold">Next</Button>
          ) : (
            <Button
              onClick={handleSubmit}
              className="btn-motion-primary h-10 rounded-lg px-5 text-sm font-bold"
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
