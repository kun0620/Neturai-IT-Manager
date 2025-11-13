import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Table2, Kanban } from 'lucide-react';
import { TableView } from '@/components/tickets/TableView';
import { KanbanView } from '@/components/tickets/KanbanView';
import { CreateTicketDialog } from '@/components/tickets/CreateTicketDialog';
import { useTickets } from '@/hooks/useTickets';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { TicketDetailDialog } from '@/components/tickets/TicketDetailDialog'; // Assuming this component will be created

export const Tickets: React.FC = () => {
  const [isCreateTicketDialogOpen, setIsCreateTicketDialogOpen] = useState(false);
  const [isTicketDetailDialogOpen, setIsTicketDetailDialogOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const { user } = useAuth();
  const { data: tickets, isLoading, error } = useTickets();

  const handleTicketClick = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setIsTicketDetailDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Error Loading Tickets"
        message={error.message}
        action={<Button onClick={() => window.location.reload()}>Retry</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tickets</h1>
        <Button onClick={() => setIsCreateTicketDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Ticket
        </Button>
      </div>

      <Tabs defaultValue="kanban" className="w-full">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="kanban">
              <Kanban className="mr-2 h-4 w-4" /> Kanban View
            </TabsTrigger>
            <TabsTrigger value="table">
              <Table2 className="mr-2 h-4 w-4" /> Table View
            </TabsTrigger>
          </TabsList>
          {/* Add filters or other actions here */}
        </div>

        <TabsContent value="kanban" className="mt-4">
          <KanbanView tickets={tickets || []} onTicketClick={handleTicketClick} />
        </TabsContent>
        <TabsContent value="table" className="mt-4">
          <TableView tickets={tickets || []} onTicketClick={handleTicketClick} />
        </TabsContent>
      </Tabs>

      {isCreateTicketDialogOpen && (
        <CreateTicketDialog
          isOpen={isCreateTicketDialogOpen}
          onClose={() => setIsCreateTicketDialogOpen(false)}
          userId={user?.id || ''}
        />
      )}

      {isTicketDetailDialogOpen && selectedTicketId && (
        <TicketDetailDialog
          isOpen={isTicketDetailDialogOpen}
          onClose={() => {
            setIsTicketDetailDialogOpen(false);
            setSelectedTicketId(null);
          }}
          ticketId={selectedTicketId}
        />
      )}
    </div>
  );
};
