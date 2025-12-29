import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

import { useTickets } from '@/hooks/useTickets';
import { useCurrentProfile } from '@/hooks/useCurrentProfile';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EditTicketDialog } from './EditTicketDialog';
import { Tables } from '@/types/database.types';

interface TicketDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  categories: Tables<'ticket_categories'>[];
}

export const TicketDetailDialog: React.FC<TicketDetailDialogProps> = ({
  isOpen,
  onClose,
  ticketId,
  categories,
}) => {
  const { useTicketById } = useTickets;
  const { data: ticket, isLoading, error } = useTicketById(ticketId);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { canManageTickets, loading: roleLoading } = useCurrentProfile();

  const getCategoryName = (categoryId: string | null) =>
    categories.find((cat) => cat.id === categoryId)?.name || 'N/A';

  if (isLoading || roleLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
            <DialogDescription>Loading ticket information...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !ticket) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>
              {error ? error.message : 'Ticket not found.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Ticket #{ticket.id.substring(0, 8)}</DialogTitle>
            <DialogDescription>Details for this support ticket.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 gap-4">
              <span className="text-sm font-medium">Title:</span>
              <span className="col-span-3">{ticket.title}</span>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <span className="text-sm font-medium">Description:</span>
              <span className="col-span-3 text-sm text-muted-foreground">
                {ticket.description || 'No description provided.'}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <span className="text-sm font-medium">Status:</span>
              <Badge>
                {ticket.status}
              </Badge>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <span className="text-sm font-medium">Priority:</span>
              <Badge variant="secondary">
                {ticket.priority}
              </Badge>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <span className="text-sm font-medium">Category:</span>
              <span className="col-span-3">
                {getCategoryName(ticket.category_id)}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <span className="text-sm font-medium">Created At:</span>
              <span className="col-span-3">
                {ticket.created_at
                  ? format(new Date(ticket.created_at), 'PPP p')
                  : 'N/A'}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <span className="text-sm font-medium">Last Updated:</span>
              <span className="col-span-3">
                {ticket.updated_at
                  ? format(new Date(ticket.updated_at), 'PPP p')
                  : 'N/A'}
              </span>
            </div>
          </div>

          <DialogFooter>
            {canManageTickets && (
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(true)}
              >
                Edit Ticket
              </Button>
            )}
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isEditDialogOpen && (
        <EditTicketDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          ticketId={ticketId}
          categories={categories}
        />
      )}
    </>
  );
};
