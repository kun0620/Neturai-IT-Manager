import React, { useState } from 'react';
import {
  Activity,
  Ticket,
  HardDrive, // Icon for assets
  LayoutDashboard,
  CircleDot, // Icon for Open tickets
  Hourglass, // Icon for In Progress tickets
  CheckCircle, // Icon for Closed tickets
  Plus, // Icon for New Ticket
  ListTodo, // Icon for View All Tickets
  PackagePlus, // Icon for Add Asset
} from 'lucide-react';
import { SummaryCard } from '@/components/dashboard/SummaryCard';
import {
  useTickets, // Import the single useTickets object
} from '@/hooks/useTickets';
import { ErrorState } from '@/components/common/ErrorState';
import { RecentTicketsTable } from '@/components/dashboard/RecentTicketsTable'; // Import the component
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'; // Import LoadingSkeleton
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { Button } from '@/components/ui/button'; // Import Button component
import { CreateTicketDialog } from '@/components/tickets/CreateTicketDialog'; // Import CreateTicketDialog

const Dashboard: React.FC = () => {
  const navigate = useNavigate(); // Initialize useNavigate
  const [isCreateTicketDialogOpen, setIsCreateTicketDialogOpen] = useState(false);

  // Destructure individual hooks from the useTickets object
  const {
    useDashboardSummary,
    useRecentTickets,
    useOpenTicketsCount,
    useInProgressTicketsCount,
    useClosedTicketsCount,
    useTicketCategories, // Add useTicketCategories
  } = useTickets;

  const {
    data: summaryData,
    isLoading: isLoadingSummary,
    isError: isErrorSummary,
    error: errorSummary,
  } = useDashboardSummary(); // Use the new summary hook

  const {
    data: openTicketsCount,
    isLoading: isLoadingOpenTickets,
    isError: isErrorOpenTickets,
    error: errorOpenTickets,
  } = useOpenTicketsCount();

  const {
    data: inProgressTicketsCount,
    isLoading: isLoadingInProgressTickets,
    isError: isErrorInProgressTickets,
    error: errorInProgressTickets,
  } = useInProgressTicketsCount();

  const {
    data: closedTicketsCount,
    isLoading: isLoadingClosedTickets,
    isError: isErrorClosedTickets,
    error: errorClosedTickets,
  } = useClosedTicketsCount();

  const {
    data: recentTickets,
    isLoading: isLoadingRecentTickets,
    isError: isErrorRecentTickets,
    error: errorRecentTickets,
  } = useRecentTickets();

  const {
    data: categories,
    isLoading: isLoadingCategories,
    isError: isErrorCategories,
    error: errorCategories,
  } = useTicketCategories(); // Fetch categories for CreateTicketDialog

  const isLoadingAny =
    isLoadingSummary ||
    isLoadingOpenTickets ||
    isLoadingInProgressTickets ||
    isLoadingClosedTickets ||
    isLoadingRecentTickets ||
    isLoadingCategories; // Include categories loading

  const isErrorAny =
    isErrorSummary ||
    isErrorOpenTickets ||
    isErrorInProgressTickets ||
    isErrorClosedTickets ||
    isErrorRecentTickets ||
    isErrorCategories; // Include categories error

  if (isLoadingAny) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="h-8 w-1/2 bg-muted rounded animate-pulse"></div>
        <div className="h-6 w-3/4 bg-muted rounded animate-pulse"></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <LoadingSkeleton />
          <LoadingSkeleton />
          <LoadingSkeleton />
          <LoadingSkeleton />
        </div>
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 animate-pulse">
          <div className="h-6 w-1/3 bg-muted rounded mb-4"></div>
          <div className="h-4 w-full bg-muted rounded mb-2"></div>
          <div className="h-4 w-full bg-muted rounded mb-2"></div>
          <div className="h-4 w-full bg-muted rounded mb-2"></div>
          <div className="h-4 w-full bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (isErrorAny) {
    return (
      <ErrorState
        title="Error Loading Dashboard"
        message={
          errorSummary?.message ||
          errorOpenTickets?.message ||
          errorInProgressTickets?.message ||
          errorClosedTickets?.message ||
          errorRecentTickets?.message ||
          errorCategories?.message || // Include categories error message
          'An unknown error occurred.'
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
        <LayoutDashboard className="h-8 w-8" /> Welcome to your Dashboard!
      </h1>
      <p className="text-muted-foreground text-lg">
        This is where you'll see an overview of your IT operations.
      </p>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setIsCreateTicketDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> New Ticket
        </Button>
        <Button onClick={() => navigate('/tickets')} variant="outline" className="flex items-center gap-2">
          <ListTodo className="h-4 w-4" /> View All Tickets
        </Button>
        <Button onClick={() => navigate('/assets/new')} variant="outline" className="flex items-center gap-2">
          <PackagePlus className="h-4 w-4" /> Add Asset
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Open Tickets"
          value={openTicketsCount || 0}
          icon={CircleDot}
          color="text-green-500"
          description="Tickets awaiting action"
          onClick={() => navigate('/tickets?status=Open')}
        />
        <SummaryCard
          title="In Progress Tickets"
          value={inProgressTicketsCount || 0}
          icon={Hourglass}
          color="text-yellow-500"
          description="Tickets currently being worked on"
          onClick={() => navigate('/tickets?status=In%20Progress')}
        />
        <SummaryCard
          title="Closed Tickets"
          value={closedTicketsCount || 0}
          icon={CheckCircle}
          color="text-red-500"
          description="Tickets that have been resolved"
          onClick={() => navigate('/tickets?status=Closed')}
        />
        <SummaryCard
          title="Total Assets"
          value={summaryData?.totalAssets || 0}
          icon={HardDrive} // Using HardDrive icon for assets
          color="text-blue-500"
          description="All IT assets managed"
          onClick={() => navigate('/assets')}
        />
      </div>

      {/* Recent Tickets Table */}
      <RecentTicketsTable tickets={recentTickets || []} />

      {/* Create Ticket Dialog */}
      {categories && (
        <CreateTicketDialog
          isOpen={isCreateTicketDialogOpen}
          onClose={() => setIsCreateTicketDialogOpen(false)}
          categories={categories}
        />
      )}
    </div>
  );
};

export default Dashboard;
