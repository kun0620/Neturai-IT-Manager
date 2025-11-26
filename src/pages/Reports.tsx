import React from 'react';
import { useTickets } from '@/hooks/useTickets';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const Reports: React.FC = () => {
  const { useAllTickets } = useTickets;
  const { data: allTickets, isLoading, isError, error } = useAllTickets();

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

  const totalTickets = allTickets?.length || 0;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
      </div>
      <p className="text-muted-foreground">
        This page provides a basic overview of your IT operations, primarily serving as a connection test for Supabase data.
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTickets}</div>
            <p className="text-xs text-muted-foreground">
              All tickets loaded from Supabase
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
