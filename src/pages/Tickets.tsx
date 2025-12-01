import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Table2, Kanban } from 'lucide-react';
import { TableView } from '@/components/tickets/TableView';
import { KanbanView } from '@/components/tickets/KanbanView';
import { CreateTicketDialog } from '@/components/tickets/CreateTicketDialog';
import { useTickets } from '@/hooks/useTickets'; // Import the single useTickets object
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { TicketDetailsDrawer } from '@/components/tickets/TicketDetailsDrawer'; // Changed to TicketDetailsDrawer

export const Tickets: React.FC = () => {
  const [isCreateTicketDialogOpen, setIsCreateTicketDialogOpen] = useState(false);
  const [isTicketDetailsDrawerOpen, setIsTicketDetailsDrawerOpen] = useState(false); // Changed state name
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const { user } = useAuth();

  // Destructure useAllTickets and useTicketCategories from the useTickets object
  const { useAllTickets, useTicketCategories } = useTickets;
  const { data: tickets, isLoading: isLoadingTickets, error: ticketsError } = useAllTickets(); // Call useAllTickets as a function
  const { data: categories, isLoading: isLoadingCategories, error: categoriesError } = useTicketCategories();

  const handleTicketClick = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setIsTicketDetailsDrawerOpen(true); // Changed to open drawer
  };

  if (isLoadingTickets || isLoadingCategories) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (ticketsError || categoriesError) {
    return (
      <EmptyState
        title="Error Loading Tickets"
        message={ticketsError?.message || categoriesError?.message || "An unknown error occurred."}
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
          <KanbanView tickets={tickets || []} categories={categories || []} onTicketClick={handleTicketClick} />
        </TabsContent>
        <TabsContent value="table" className="mt-4">
          <TableView tickets={tickets || []} categories={categories || []} onTicketClick={handleTicketClick} />
        </TabsContent>
      </Tabs>

      {isCreateTicketDialogOpen && (
        <CreateTicketDialog
          isOpen={isCreateTicketDialogOpen}
          onClose={() => setIsCreateTicketDialogOpen(false)}
          categories={categories || []} // Pass categories to dialog
        />
      )}

      {isTicketDetailsDrawerOpen && selectedTicketId && (
        <TicketDetailsDrawer // Changed to TicketDetailsDrawer
          isOpen={isTicketDetailsDrawerOpen}
          onClose={() => {
            setIsTicketDetailsDrawerOpen(false);
            setSelectedTicketId(null);
          }}
          ticketId={selectedTicketId}
          // categories={categories || []} // Categories are not directly used in this basic drawer
        />
      )}
    </div>
  );
};
