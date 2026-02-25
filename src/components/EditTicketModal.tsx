import React from 'react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type UserOption = {
  id: string;
  name: string | null;
};

type EditTicketModalProps = {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  isStaff: boolean;
  isUpdatingTicket: boolean;
  selectedStatus: string;
  onStatusChange: (status: 'open' | 'in_progress' | 'closed') => void;
  assignedUser: string;
  onAssignUser: (userId: string) => void;
  users: UserOption[];
  draftDueDate?: Date;
  draftDueTime: string;
  onDraftDueDateChange: (date: Date | undefined) => void;
  onDraftDueTimeChange: (value: string) => void;
  onSaveDueDate: () => void;
  currentAssigneeLabel: string;
  currentDueDateLabel: string;
};

const EditTicketModal: React.FC<EditTicketModalProps> = ({
  isOpen,
  onClose,
  isStaff,
  isUpdatingTicket,
  selectedStatus,
  onStatusChange,
  assignedUser,
  onAssignUser,
  users,
  draftDueDate,
  draftDueTime,
  onDraftDueDateChange,
  onDraftDueTimeChange,
  onSaveDueDate,
  currentAssigneeLabel,
  currentDueDateLabel,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl overflow-hidden rounded-xl border border-slate-200 p-0 dark:border-slate-800 max-sm:h-screen max-sm:w-screen max-sm:max-w-none max-sm:rounded-none">
        <DialogHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-5 dark:border-slate-800 dark:bg-slate-800/50">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Edit Ticket
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
            Update status, assignee, and due date.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-5 overflow-y-auto p-6 max-sm:max-h-[calc(100vh-140px)]">
          <div>
            <p className="mb-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">Status</p>
            <Select
              value={selectedStatus}
              onValueChange={(v) => onStatusChange(v as 'open' | 'in_progress' | 'closed')}
              disabled={!isStaff || isUpdatingTicket}
            >
              <SelectTrigger className="h-11 w-full rounded-lg border-slate-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-800">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">Assigned To</p>
            {isStaff ? (
              <Select value={assignedUser ?? ''} onValueChange={onAssignUser}>
                <SelectTrigger className="h-11 w-full rounded-lg border-slate-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-800">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">
                    <span className="text-muted-foreground">Unassigned</span>
                  </SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm">{currentAssigneeLabel}</p>
            )}
          </div>

          <div>
            <p className="mb-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">Due Date</p>
            {isStaff ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10 rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                      {draftDueDate ? format(draftDueDate, 'MMM dd, yyyy') : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={draftDueDate}
                      onSelect={onDraftDueDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <input
                  type="time"
                  value={draftDueTime}
                  onChange={(e) => onDraftDueTimeChange(e.target.value)}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                />

                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Click "Save Due Date" below to apply.
                </span>
              </div>
            ) : (
              <p className="text-sm">{currentDueDateLabel}</p>
            )}
          </div>

          {!isStaff && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
              You have read-only permission for ticket editing fields.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/30 max-sm:sticky max-sm:bottom-0">
          <Button
            type="button"
            variant="ghost"
            className="h-10 rounded-lg px-5 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            onClick={() => onClose(false)}
          >
            Close
          </Button>

          <Button
            type="button"
            className="h-10 rounded-lg bg-primary px-5 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90"
            onClick={onSaveDueDate}
            disabled={!isStaff || isUpdatingTicket || !draftDueDate}
          >
            {isUpdatingTicket ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Due Date
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditTicketModal;
