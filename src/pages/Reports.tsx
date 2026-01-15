import React from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { useReportOverview } from '@/hooks/useReportOverview';
import { subDays, formatISO } from 'date-fns';
import { SummaryCard } from '@/components/dashboard/SummaryCard';
import { CircleDot, Hourglass, CheckCircle, LayoutDashboard } from 'lucide-react';


const Reports: React.FC = () => {
const from = formatISO(subDays(new Date(), 7));
const to = formatISO(new Date());

const {
  data,
  isLoading,
  isError,
  error,
} = useReportOverview(from, to);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <ExclamationTriangleIcon className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load tickets for reports: {error?.message || 'Unknown error'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) {
  return null;
}


  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
      </div>
      <p className="text-muted-foreground">
        This page provides a basic overview of your IT operations, primarily serving as a connection test for Supabase data.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Tickets"
          value={data.total}
          icon={LayoutDashboard}
          description="Last 7 days"
        />
        <SummaryCard
          title="Open"
          value={data.open}
          icon={CircleDot}
          color="text-slate-500"
        />
        <SummaryCard
          title="In Progress"
          value={data.inProgress}
          icon={Hourglass}
          color="text-yellow-500"
        />
        <SummaryCard
          title="Closed"
          value={data.closed}
          icon={CheckCircle}
          color="text-green-600"
        />
      </div>
    </div>
  );
};

export default Reports;
