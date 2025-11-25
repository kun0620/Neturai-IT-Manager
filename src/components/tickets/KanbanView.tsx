import React from 'react';
import { Tables } from '@/types/database.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface KanbanViewProps {
  tickets: Tables<'tickets'>[];
  categories: Tables<'ticket_categories'>[];
  onTicketClick: (ticketId: string) => void;
}

export const KanbanView: React.FC<KanbanViewProps> = ({ tickets, categories, onTicketClick }) => {
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

  const statuses: Tables<'tickets'>['status'][] = ['Open', 'In Progress', 'Resolved', 'Closed'];

  if (tickets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No tickets found. Create a new one to get started!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statuses.map((status) => (
        <div key={status} className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold capitalize">{status}</h3>
          <div className="flex flex-col gap-3 min-h-[100px] rounded-md border p-2 bg-muted/40">
            {tickets
              .filter((ticket) => ticket.status === status)
              .map((ticket) => (
                <Card
                  key={ticket.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onTicketClick(ticket.id)}
                >
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-base">{ticket.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 text-sm text-muted-foreground">
                    <div className="flex flex-wrap gap-1 mb-2">
                      <Badge variant="secondary">{getCategoryName(ticket.category_id)}</Badge>
                      <Badge className={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
                    </div>
                    <p className="text-xs">Created: {format(new Date(ticket.created_at), 'MMM dd, yyyy')}</p>
                  </CardContent>
                </Card>
              ))}
            {tickets.filter((ticket) => ticket.status === status).length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">No {status} tickets</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
