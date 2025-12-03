import React, { useState, useEffect } from 'react';
import { PlusCircle, List, KanbanSquare, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateTicketDialog } from '@/components/tickets/CreateTicketDialog';
import { TableView } from '@/components/tickets/TableView';
import { KanbanView } from '@/components/tickets/KanbanView';
import { useTickets } from '@/hooks/useTickets';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { TicketDetailsDrawer } from '@/components/tickets/TicketDetailsDrawer'; // Import the drawer
import { useLocation } from 'react-router-dom'; // Import useLocation

export const Tickets: React.FC = () => {
  const [isCreateTicketDialogOpen, setIsCreateTicketDialogOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false); // State for drawer
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null); // State for selected ticket ID
  const [searchTerm, setSearchTerm] = useState('');

  const location = useLocation(); // Get location object

  const { useAllTickets, useTicketCategories } = useTickets;

  const {
    data: tickets,
    isLoading: isLoadingTickets,
    isError: isErrorTickets,
    error: ticketsError,
  } = useAllTickets();

  const {
    data: categories,
    isLoading: isLoadingCategories,
    isError: isErrorCategories,
    error: categoriesError,
  } = useTicketCategories();

  // Effect to open drawer if ticketId is passed in location state
  useEffect(() => {
    if (location.state?.ticketId) {
      setSelectedTicketId(location.state.ticketId);
      setIsDrawerOpen(true);
      // Clear the state so it doesn't reopen on subsequent visits
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleOpenDrawer = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedTicketId(null);
  };

  const filteredTickets = tickets?.filter(ticket =>
    ticket.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    categories?.find(cat => cat.id === ticket.category_id)?.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoadingTickets || isLoadingCategories) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="h-8 w-1/2 bg-muted rounded animate-pulse"></div>
        <div className="h-6 w-3/4 bg-muted rounded animate-pulse"></div>
        <div className="flex justify-between items-center">
          <div className="h-10 w-64 bg-muted rounded animate-pulse"></div>
          <div className="h-10 w-24 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <LoadingSkeleton />
          <LoadingSkeleton />
          <LoadingSkeleton />
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  if (isErrorTickets || isErrorCategories) {
    return (
      <ErrorState
        title="Error Loading Tickets"
        message={ticketsError?.message || categoriesError?.message || 'An unknown error occurred.'}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Ticket Management</h1>
        <Button onClick={() => setIsCreateTicketDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> New Ticket
        </Button>
      </div>
      <p className="text-muted-foreground text-lg">
        Manage all incoming, in-progress, and resolved support tickets.
      </p>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="table">
        <TabsList className="grid w-fit grid-cols-2">
          <TabsTrigger value="table">
            <List className="mr-2 h-4 w-4" /> Table View
          </TabsTrigger>
          <TabsTrigger value="kanban">
            <KanbanSquare className="mr-2 h-4 w-4" /> Kanban View
          </TabsTrigger>
        </TabsList>
        <TabsContent value="table">
          <TableView
            tickets={filteredTickets}
            categories={categories || []}
            onOpenDrawer={handleOpenDrawer} // Pass handler to TableView
          />
        </TabsContent>
        <TabsContent value="kanban">
          <KanbanView
            tickets={filteredTickets}
            categories={categories || []}
            onOpenDrawer={handleOpenDrawer} // Pass handler to KanbanView
          />
        </TabsContent>
      </Tabs>

      <CreateTicketDialog
        isOpen={isCreateTicketDialogOpen}
        onClose={() => setIsCreateTicketDialogOpen(false)}
        categories={categories || []}
      />

      {/* Render the TicketDetailsDrawer */}
      <TicketDetailsDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        ticketId={selectedTicketId}
        categories={categories || []}
      />
    </div>
  );
};
