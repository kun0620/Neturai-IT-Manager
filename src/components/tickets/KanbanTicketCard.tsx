import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ticket } from '@/types/supabase'; // Assuming Ticket type is defined here
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface KanbanTicketCardProps {
  ticket: Ticket;
  onClick: () => void;
  isOverlay?: boolean;
}

export const KanbanTicketCard: React.FC<KanbanTicketCardProps> = ({ ticket, onClick, isOverlay }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.8 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Open':
        return 'default';
      case 'In Progress':
        return 'secondary';
      case 'Resolved':
        return 'success'; // Assuming 'success' variant exists
      case 'Closed':
        return 'outline';
      default:
        return 'default';
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'cursor-pointer hover:shadow-md transition-shadow duration-200',
        isOverlay && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm font-semibold truncate">{ticket.title}</CardTitle>
        <CardDescription className="text-xs">#{ticket.ticket_code}</CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-0 text-xs space-y-1">
        <div className="flex items-center justify-between">
          <Badge variant={getStatusVariant(ticket.status)}>{ticket.status}</Badge>
          {ticket.priority && (
            <Badge variant="outline" className="text-xs">
              {ticket.priority}
            </Badge>
          )}
        </div>
        {ticket.assigned_to && (
          <p className="text-muted-foreground">Assigned: {ticket.assigned_to}</p>
        )}
        <p className="text-muted-foreground">
          Updated: {format(new Date(ticket.updated_at), 'MMM d, yyyy')}
        </p>
      </CardContent>
    </Card>
  );
};
