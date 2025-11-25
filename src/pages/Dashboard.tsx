import React from 'react';
import {
  Activity,
  Ticket,
  HardDrive, // Icon for assets
  LayoutDashboard,
} from 'lucide-react';
import { SummaryCard } from '@/components/dashboard/SummaryCard';
import {
  useTickets, // Import the single useTickets object
} from '@/hooks/useTickets';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorState } from '@/components/common/ErrorState';
import { RecentTicketsTable } from '@/components/dashboard/RecentTicketsTable'; // Import the component

const Dashboard: React.FC = () => {
  // Destructure individual hooks from the useTickets object
  const { useDashboardSummary, useRecentTickets } = useTickets;

  const {
    data: summaryData,
    isLoading: isLoadingSummary,
    isError: isErrorSummary,
    error: errorSummary,
  } = useDashboardSummary(); // Use the new summary hook

  const {
    data: recentTickets,
    isLoading: isLoadingRecentTickets,
    isError: isErrorRecentTickets,
    error: errorRecentTickets,
  } = useRecentTickets();

  if (isLoadingSummary || isLoadingRecentTickets) {
    return <LoadingSpinner />;
  }

  if (isErrorSummary || isErrorRecentTickets) {
    return (
      <ErrorState
        title="Error Loading Dashboard"
        message={
          errorSummary?.message ||
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
          title="Total Tickets"
          value={summaryData?.totalTickets || 0}
          icon={Ticket}
          color="text-purple-500"
          description="All tickets in the system"
        />
        <SummaryCard
          title="Total Assets"
          value={summaryData?.totalAssets || 0}
          icon={HardDrive} // Using HardDrive icon for assets
          color="text-blue-500"
          description="All IT assets managed"
        />
        {/* Removed other summary cards as per simplified requirements */}
      </div>

      {/* Recent Tickets Table */}
      <RecentTicketsTable tickets={recentTickets || []} />
    </div>
  );
};

export default Dashboard;
