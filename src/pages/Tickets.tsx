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
import { useSearchParams } from 'react-router-dom';
import { hasPermission } from '@/lib/permissions';
import { motion } from 'motion/react';
import { createFadeSlideUp } from '@/lib/motion';

export const Tickets: React.FC = () => {
  const {
    role,
    session,
  } = useAuth();
  
  const myUserId = session?.user?.id;

  const canManageTickets = hasPermission(role, 'ticket.manage');
  
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
        <LoadingSkeleton count={8} className="md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4" />
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
    <motion.div className="flex flex-col gap-6 p-4 md:p-6" {...createFadeSlideUp(0)}>
      <motion.div
        className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        {...createFadeSlideUp(0.04)}
      >
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Neturai IT Manager
          </p>
          <h1 className="text-3xl font-semibold text-foreground">
            Ticket Management
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage all incoming, in-progress, and resolved support tickets.
          </p>
          {slaFilter === 'breach' && (
            <div className="text-sm text-red-600">
              Showing SLA breached tickets
            </div>
          )}
        </div>

        <Button
          onClick={() => setIsCreateTicketDialogOpen(true)}
          className="btn-motion-primary"
        >
          <PlusCircle className="mr-2 h-4 w-4" /> New Ticket
        </Button>
      </motion.div>

      <motion.div className="flex items-center gap-4" {...createFadeSlideUp(0.08)}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </motion.div>
      {canManageTickets && (
        <motion.div className="flex items-center gap-2" {...createFadeSlideUp(0.12)}>
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
        </motion.div>
      )}
      <motion.div {...createFadeSlideUp(0.16)}>
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
      </motion.div>

      <CreateTicketDialog
        isOpen={isCreateTicketDialogOpen}
        onClose={() => setIsCreateTicketDialogOpen(false)}
        categories={categories || []}
      />

      {/* Render the TicketDetailsDrawer */}
      {categories && <TicketDetailsDrawer categories={categories} />}
    </motion.div>
  );
};
