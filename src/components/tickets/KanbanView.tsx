import React from 'react';
import { Tables } from '@/types/database.types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

interface KanbanViewProps {
  tickets: Tables<'tickets'>[];
  categories: Tables<'ticket_categories'>[];
  onTicketClick: (ticketId: string) => void;
}

export const KanbanView: React.FC<KanbanViewProps> = ({ tickets, categories, onTicketClick }) => {
  const getCategoryName = (categoryId: string | null) => {
    return categories.find((cat) => cat.id === categoryId)?.name || 'N/A';
  };

  const getStatusColor = (status: Tables<'tickets'>['status']) => {
    switch (status) {
      case 'Open':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'In Progress':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'Resolved':
        return 'bg-green-500 hover:bg-green-600';
      case 'Closed':
        return 'bg-gray-500 hover:bg-gray-600';
      default:
        return 'bg-gray-400 hover:bg-gray-500';
    }
  };

  const getPriorityVariant = (priority: Tables<'tickets'>['priority']) => {
    switch (priority) {
      case 'Low':
        return 'outline';
      case 'Medium':
        return 'secondary';
      case 'High':
        return 'default';
      case 'Critical':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const statusColumns = ['Open', 'In Progress', 'Resolved', 'Closed'] as Tables<'tickets'>['status'][];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statusColumns.map((status) => (
        <div key={status} className="flex flex-col gap-3">
          <h3 className={`text-lg font-semibold p-2 rounded-md text-white ${getStatusColor(status)}`}>
            {status} ({tickets.filter((t) => t.status === status).length})
          </h3>
          <div className="flex flex-col gap-3 min-h-[100px] p-2 border border-dashed rounded-md">
            {tickets
              .filter((t) => t.status === status)
              .map((ticket) => (
                <Card
                  key={ticket.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
                  onClick={() => onTicketClick(ticket.id)}
                >
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-base font-semibold">
                      {ticket.title}
                    </CardTitle>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>#{ticket.id.substring(0, 8)}</span>
                      <span>
                        {ticket.created_at ? format(new Date(ticket.created_at), 'MMM d') : 'N/A'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 flex flex-wrap gap-2">
                    <Badge variant={getPriorityVariant(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                    <Badge variant="secondary">{getCategoryName(ticket.category_id)}</Badge>
                    {/* Add assignee badge if available */}
                    {ticket.assigned_to && (
                      <Badge variant="outline">Assigned</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            {tickets.filter((t) => t.status === status).length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">No tickets in this status.</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
