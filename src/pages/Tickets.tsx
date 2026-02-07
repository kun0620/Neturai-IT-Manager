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
import { useAuth } from '@/hooks/useAuth';
import { useTicketDrawer } from '@/context/TicketDrawerContext';
import { useSearchParams } from 'react-router-dom';
import { hasPermission } from '@/lib/permissions';

export const Tickets: React.FC = () => {
  const {
    role,
    session,
  } = useAuth();
  
  const myUserId = session?.user?.id;

  const canManageTickets = hasPermission(role, 'ticket.manage');
  const { openDrawer } = useTicketDrawer();
  
  const [isCreateTicketDialogOpen, setIsCreateTicketDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchParams] = useSearchParams();
  const slaFilter = searchParams.get('sla'); // 'breach' | null

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

  const [showMyTickets, setShowMyTickets] = useState(false);

  
  useEffect(() => {
    if (!canManageTickets) {
      setShowMyTickets(true);
    }
  }, [canManageTickets]);


const SLA_HOURS: Record<string, number> = {
    Low: 72,
    Medium: 48,
    High: 24,
    Critical: 8,
  };

const filteredTickets =
  tickets?.filter(ticket => {
    const keyword = searchTerm.toLowerCase();

    const matchKeyword =
      ticket.title?.toLowerCase().includes(keyword) ||
      ticket.description?.toLowerCase().includes(keyword) ||
      ticket.status?.toLowerCase().includes(keyword);

    if (slaFilter !== 'breach') return matchKeyword;

    // SLA breach logic
    if (!ticket.created_at || !ticket.priority) return false;

    const sla = SLA_HOURS[ticket.priority];
    if (!sla) return false;

    const start = new Date(ticket.created_at).getTime();
    const end = ticket.updated_at
      ? new Date(ticket.updated_at).getTime()
      : Date.now();

    const hours = (end - start) / (1000 * 60 * 60);

    return hours > sla && ticket.status !== 'closed';
  }) || [];


const displayedTickets = showMyTickets && myUserId
  ? filteredTickets.filter(
      t =>
        t.assigned_to === myUserId ||
        t.created_by === myUserId
    )
  : filteredTickets;


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
        {slaFilter === 'breach' && (
          <div className="text-sm text-red-600">
            Showing SLA breached tickets
          </div>
        )}
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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      {canManageTickets && (
        <div className="flex items-center gap-2">
          <Button
            variant={!showMyTickets ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowMyTickets(false)}
          >
            All Tickets
          </Button>

          <Button
            variant={showMyTickets ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowMyTickets(true)}
          >
            My Tickets
          </Button>
        </div>
      )}
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
          {displayedTickets.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              No tickets found.
            </div>
          )}

          <TableView
            tickets={displayedTickets}
            categories={categories || []}
          />
        </TabsContent>
        <TabsContent value="kanban">
          <KanbanView
            tickets={displayedTickets}
            categories={categories || []}
          />
        </TabsContent>
      </Tabs>

      <CreateTicketDialog
        isOpen={isCreateTicketDialogOpen}
        onClose={() => setIsCreateTicketDialogOpen(false)}
        categories={categories || []}
      />

      {/* Render the TicketDetailsDrawer */}
      {categories && <TicketDetailsDrawer categories={categories} />}
    </div>
  );
};
