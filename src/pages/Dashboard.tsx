import React from 'react';
import {
  Activity,
  Ticket,
  HardDrive, // Icon for assets
  LayoutDashboard,
  CircleDot, // Icon for Open tickets
  Hourglass, // Icon for In Progress tickets
  CheckCircle, // Icon for Closed tickets
} from 'lucide-react';
import { SummaryCard } from '@/components/dashboard/SummaryCard';
import {
  useTickets, // Import the single useTickets object
} from '@/hooks/useTickets';
import { ErrorState } from '@/components/common/ErrorState';
import { RecentTicketsTable } from '@/components/dashboard/RecentTicketsTable'; // Import the component
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'; // Import LoadingSkeleton

const Dashboard: React.FC = () => {
  // Destructure individual hooks from the useTickets object
  const {
    useDashboardSummary,
    useRecentTickets,
    useOpenTicketsCount,
    useInProgressTicketsCount,
    useClosedTicketsCount,
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

  const isLoadingAny =
    isLoadingSummary ||
    isLoadingOpenTickets ||
    isLoadingInProgressTickets ||
    isLoadingClosedTickets ||
    isLoadingRecentTickets;

  const isErrorAny =
    isErrorSummary ||
    isErrorOpenTickets ||
    isErrorInProgressTickets ||
    isErrorClosedTickets ||
    isErrorRecentTickets;

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

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Open Tickets"
          value={openTicketsCount || 0}
          icon={CircleDot}
          color="text-green-500"
          description="Tickets awaiting action"
        />
        <SummaryCard
          title="In Progress Tickets"
          value={inProgressTicketsCount || 0}
          icon={Hourglass}
          color="text-yellow-500"
          description="Tickets currently being worked on"
        />
        <SummaryCard
          title="Closed Tickets"
          value={closedTicketsCount || 0}
          icon={CheckCircle}
          color="text-red-500"
          description="Tickets that have been resolved"
        />
        <SummaryCard
          title="Total Assets"
          value={summaryData?.totalAssets || 0}
          icon={HardDrive} // Using HardDrive icon for assets
          color="text-blue-500"
          description="All IT assets managed"
        />
      </div>

      {/* Recent Tickets Table */}
      <RecentTicketsTable tickets={recentTickets || []} />
    </div>
  );
};

export default Dashboard;
