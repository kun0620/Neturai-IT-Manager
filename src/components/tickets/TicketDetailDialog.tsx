import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useTickets } from '@/hooks/useTickets';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Tables } from '@/types/database.types';
import { format } from 'date-fns';

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

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'N/A';
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Unknown';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-500 text-white';
      case 'High':
        return 'bg-orange-500 text-white';
      case 'Medium':
        return 'bg-yellow-500 text-black';
      case 'Low':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-200 text-black';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-blue-500 text-white';
      case 'In Progress':
        return 'bg-indigo-500 text-white';
      case 'Resolved':
        return 'bg-emerald-500 text-white';
      case 'Closed':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-200 text-black';
    }
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <LoadingSpinner />
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <EmptyState
            title="Error Loading Ticket"
            message={error.message}
            action={<Button onClick={() => window.location.reload()}>Retry</Button>}
          />
        </DialogContent>
      </Dialog>
    );
  }

  if (!ticket) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <EmptyState title="Ticket Not Found" message="The selected ticket could not be loaded." />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{ticket.title}</DialogTitle>
          <DialogDescription>Ticket ID: {ticket.id}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium col-span-1">Category:</span>
            <span className="col-span-3">{getCategoryName(ticket.category_id)}</span>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium col-span-1">Priority:</span>
            <span className="col-span-3">
              <Badge className={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
            </span>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium col-span-1">Status:</span>
            <span className="col-span-3">
              <Badge className={getStatusColor(ticket.status)}>{ticket.status}</Badge>
            </span>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium col-span-1">Description:</span>
            <span className="col-span-3">{ticket.description || 'No description provided.'}</span>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium col-span-1">Created By:</span>
            <span className="col-span-3">{ticket.created_by}</span> {/* This will be a UUID, ideally should fetch user name */}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium col-span-1">Assigned To:</span>
            <span className="col-span-3">{ticket.assigned_to || 'Unassigned'}</span> {/* This will be a UUID, ideally should fetch user name */}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium col-span-1">Created At:</span>
            <span className="col-span-3">{format(new Date(ticket.created_at), 'MMM dd, yyyy HH:mm')}</span>
          </div>
          {ticket.resolved_at && (
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-sm font-medium col-span-1">Resolved At:</span>
              <span className="col-span-3">{format(new Date(ticket.resolved_at), 'MMM dd, yyyy HH:mm')}</span>
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium col-span-1">Last Updated:</span>
            <span className="col-span-3">{format(new Date(ticket.updated_at), 'MMM dd, yyyy HH:mm')}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
