import { motion } from 'framer-motion';
import { Tables } from '@/types/database.types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TICKET_STATUS_OPTIONS } from '@/constants/enums';
import { format } from 'date-fns';
import { useTicketDrawer } from '@/context/TicketDrawerContext';


interface KanbanViewProps {
  tickets: Tables<'tickets'>[];
  categories: Tables<'ticket_categories'>[];
}

export function KanbanView({ tickets, categories }: KanbanViewProps) {
  const getCategoryName = (categoryId: string | null) => {
    return categories.find((cat) => cat.id === categoryId)?.name || 'N/A';
  };
  const { openDrawer } = useTicketDrawer();
  const getPriorityBadgeVariant = (priority: Tables<'tickets'>['priority']) => {
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

  const ticketsByStatus = TICKET_STATUS_OPTIONS.reduce((acc, status) => {
    acc[status] = tickets.filter((ticket) => ticket.status === status);
    return acc;
  }, {} as Record<Tables<'tickets'>['status'], Tables<'tickets'>[]>);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
    >
      {TICKET_STATUS_OPTIONS.map((status) => (
        <Card key={status} className="flex flex-col h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center justify-between">
              {status}
              <Badge variant="secondary" className="ml-2">
                {ticketsByStatus[status]?.length || 0}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-3">
            {ticketsByStatus[status] && ticketsByStatus[status].length > 0 ? (
              ticketsByStatus[status].map((ticket) => (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="border rounded-lg p-3 bg-background shadow-sm cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button,a')) return;
                    openDrawer(ticket.id);
                  }}
                >
                  <h4 className="font-medium text-sm mb-1">{ticket.title}</h4>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {ticket.description || 'No description'}
                  </p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {getCategoryName(ticket.category_id)}
                    </Badge>
                    <Badge variant={getPriorityBadgeVariant(ticket.priority)} className="text-xs">
                      {ticket.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Created: {ticket.created_at ? format(new Date(ticket.created_at), 'MMM dd, yyyy') : 'N/A'}
                  </p>
                </motion.div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No tickets in this status.</p>
            )}
          </CardContent>
        </Card>
      ))}
    </motion.div>
  );
}
