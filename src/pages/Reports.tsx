import React, { useState } from 'react';
import { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { TicketsPerMonthChart } from '@/components/dashboard/TicketsPerMonthChart';
import { AverageResolutionTimeChart } from '@/components/dashboard/AverageResolutionTimeChart';
import { IssueCategoriesPieChart } from '@/components/dashboard/IssueCategoriesPieChart';
import { TopRepairedAssetsTable } from '@/components/dashboard/TopRepairedAssetsTable';
import { ExportButton } from '@/components/ui/export-button';
import { useReportsData } from '@/hooks/useReportsData';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

const Reports: React.FC = () => {
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const {
    ticketsPerMonthData,
    avgResolutionTimeData,
    avgResolutionTimeKpi,
    issueCategoriesData,
    topRepairedAssetsData,
    isLoading,
    error,
  } = useReportsData(date);

  const handleExport = (format: 'pdf' | 'csv') => {
    // In a real application, you would trigger a server-side export
    // or use a client-side library to generate the file.
    console.log(`Exporting data as ${format}...`);
    // For demonstration, we'll just log the current data
    console.log('Tickets per Month:', ticketsPerMonthData);
    console.log('Average Resolution Time:', avgResolutionTimeKpi);
    console.log('Issue Categories:', issueCategoriesData);
    console.log('Top Repaired Assets:', topRepairedAssetsData);
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        <DatePickerWithRange date={date} setDate={setDate} />
      </div>
      <p className="text-muted-foreground">
        View various reports and analytics related to your IT operations.
      </p>

      {error && (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load report data: {error.message}
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[300px] w-full md:col-span-2 lg:col-span-3" />
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <TicketsPerMonthChart data={ticketsPerMonthData} />
            <AverageResolutionTimeChart
              data={avgResolutionTimeData}
              kpiValue={avgResolutionTimeKpi}
            />
            <IssueCategoriesPieChart data={issueCategoriesData} />
          </div>
          <TopRepairedAssetsTable data={topRepairedAssetsData} />
        </>
      )}

      <div className="flex justify-end mt-4">
        <ExportButton onExport={handleExport} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default Reports;
