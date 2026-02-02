import React, { useState } from 'react';
import {
  HardDrive,
  LayoutDashboard,
  CircleDot,
  Hourglass,
  CheckCircle,
  Plus,
  ListTodo,
  PackagePlus,
  Activity,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { SummaryCard } from '@/components/dashboard/SummaryCard';
import { useTickets } from '@/hooks/useTickets';
import { ErrorState } from '@/components/common/ErrorState';
import { RecentTicketsTable } from '@/components/dashboard/RecentTicketsTable';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CreateTicketDialog } from '@/components/tickets/CreateTicketDialog';
import { TicketDetailsDrawer } from '@/components/tickets/TicketDetailsDrawer';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isCreateTicketDialogOpen, setIsCreateTicketDialogOpen] =
  useState(false);
  
  const {
    useDashboardSummary,
    useRecentTickets,
    useOpenTicketsCount,
    useInProgressTicketsCount,
    useClosedTicketsCount,
    useTicketCategories,
    useTodayTicketsCount,
    useOverdueTicketsCount,
    useAvgResolutionTime,
  } = useTickets;

  const {
    data: summaryData,
    isLoading: isLoadingSummary,
    isError: isErrorSummary,
    error: errorSummary,
  } = useDashboardSummary();

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
  } = useTicketCategories();

  const {
      data: todayTicketsCount,
      isLoading: isLoadingTodayTickets,
    } = useTodayTicketsCount();

  const {
      data: overdueTicketsCount,
      isLoading: isLoadingOverdueTickets,
    } = useOverdueTicketsCount();

  const {
      data: avgResolutionHours,
      isLoading: isLoadingAvgResolution,
    } = useAvgResolutionTime();

  const isLoadingAny =
    isLoadingSummary ||
    isLoadingOpenTickets ||
    isLoadingInProgressTickets ||
    isLoadingClosedTickets ||
    isLoadingRecentTickets ||
    isLoadingTodayTickets ||
    isLoadingOverdueTickets ||
    isLoadingAvgResolution ||
    isLoadingCategories;

  const isErrorAny =
    isErrorSummary ||
    isErrorOpenTickets ||
    isErrorInProgressTickets ||
    isErrorClosedTickets ||
    isErrorRecentTickets ||
    isErrorCategories;

  if (isLoadingAny) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <LoadingSkeleton />
          <LoadingSkeleton />
          <LoadingSkeleton />
          <LoadingSkeleton />
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
          errorCategories?.message ||
          'An unknown error occurred.'
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <LayoutDashboard className="h-8 w-8" />
        Dashboard
      </h1>
      <p className="text-muted-foreground">
        Track, manage, and resolve IT tickets at a glance
      </p>
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => setIsCreateTicketDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> New Ticket
        </Button>

        <Button
          onClick={() => navigate('/tickets')}
          variant="outline"
          className="flex items-center gap-2"
        >
          <ListTodo className="h-4 w-4" /> View All Tickets
        </Button>

        <Button
          onClick={() => navigate('/assets/new')}
          variant="outline"
          className="flex items-center gap-2"
        >
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
          onClick={() => navigate('/tickets?status=open')}
        />
        <SummaryCard
          title="In Progress Tickets"
          value={inProgressTicketsCount || 0}
          icon={Hourglass}
          color="text-yellow-500"
          description="Tickets currently being worked on"
          onClick={() => navigate('/tickets?status=in_progress')}
        />
        <SummaryCard
          title="Closed Tickets"
          value={closedTicketsCount || 0}
          icon={CheckCircle}
          color="text-red-500"
          description="Tickets that have been resolved"
          onClick={() => navigate('/tickets?status=closed')}
        />
        <SummaryCard
          title="Total Assets"
          value={summaryData?.totalAssets || 0}
          icon={HardDrive}
          color="text-blue-500"
          description="All IT assets managed"
          onClick={() => navigate('/assets')}
        />
        <SummaryCard
          title="Tickets Today"
          value={todayTicketsCount || 0}
          icon={Activity}
          color="text-indigo-500"
          description="New tickets created today"
          className="border-indigo-200"
        />
        <SummaryCard
          title="Overdue Tickets"
          value={overdueTicketsCount || 0}
          icon={AlertTriangle}
          color="text-red-500"
          description="Tickets past their due date"
          className="border-red-200"
          onClick={() => navigate('/tickets?filter=overdue')}
        />
        <SummaryCard
          title="Avg Resolution Time"
          value={avgResolutionHours !== null ? `${avgResolutionHours} hrs` : '—'}
          icon={Clock}
          color="text-emerald-500"
          description="Average time to resolve tickets"
        />
        <SummaryCard
          title="Total Tickets"
          value={summaryData?.totalTickets || 0}
          icon={ListTodo}
          description="All tickets in the system"
        />
      </div>

      {/* Recent Tickets */}
      <RecentTicketsTable
        tickets={recentTickets || []}
        isLoading={isLoadingRecentTickets}
      />

      {/* Drawer (state comes from Context) */}
      {categories && <TicketDetailsDrawer categories={categories} />}

      {/* Create Ticket */}
      {isCreateTicketDialogOpen && (
        <CreateTicketDialog
          isOpen={isCreateTicketDialogOpen}
          onClose={() => setIsCreateTicketDialogOpen(false)}
          categories={categories || []}
        />
      )}
    </div>
  );
};

export default Dashboard;
