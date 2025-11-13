import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { DateRange } from 'react-day-picker';
import { endOfDay, startOfDay } from 'date-fns';

interface TicketsPerMonth {
  month: string;
  tickets: number;
}

interface AverageResolutionTime {
  avg_time_hours: number;
}

interface IssueCategory {
  category_name: string;
  count: number;
}

interface TopRepairedAsset {
  asset_name: string;
  asset_code: string;
  repairs_count: number;
}

export const useReportsData = (dateRange: DateRange | undefined) => {
  const startDate = dateRange?.from ? startOfDay(dateRange.from) : undefined;
  const endDate = dateRange?.to ? endOfDay(dateRange.to) : undefined;

  const queryEnabled = !!startDate && !!endDate;

  const {
    data: ticketsPerMonthData,
    isLoading: isLoadingTicketsPerMonth,
    error: ticketsPerMonthError,
  } = useQuery<TicketsPerMonth[], Error>({
    queryKey: ['reports', 'ticketsPerMonth', startDate, endDate],
    queryFn: async () => {
      if (!startDate || !endDate) return [];
      const { data, error } = await supabase.rpc('get_tickets_created_per_month', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });
      if (error) throw error;
      return data || [];
    },
    enabled: queryEnabled,
  });

  const {
    data: avgResolutionTimeData,
    isLoading: isLoadingAvgResolutionTime,
    error: avgResolutionTimeError,
  } = useQuery<AverageResolutionTime[], Error>({
    queryKey: ['reports', 'avgResolutionTime', startDate, endDate],
    queryFn: async () => {
      if (!startDate || !endDate) return [];
      const { data, error } = await supabase.rpc('get_average_resolution_time', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });
      if (error) throw error;
      return data || [];
    },
    enabled: queryEnabled,
  });

  const {
    data: issueCategoriesData,
    isLoading: isLoadingIssueCategories,
    error: issueCategoriesError,
  } = useQuery<IssueCategory[], Error>({
    queryKey: ['reports', 'issueCategories', startDate, endDate],
    queryFn: async () => {
      if (!startDate || !endDate) return [];
      const { data, error } = await supabase.rpc('get_issue_categories_distribution', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });
      if (error) throw error;
      return data || [];
    },
    enabled: queryEnabled,
  });

  const {
    data: topRepairedAssetsData,
    isLoading: isLoadingTopRepairedAssets,
    error: topRepairedAssetsError,
  } = useQuery<TopRepairedAsset[], Error>({
    queryKey: ['reports', 'topRepairedAssets', startDate, endDate],
    queryFn: async () => {
      if (!startDate || !endDate) return [];
      const { data, error } = await supabase.rpc('get_top_repaired_assets', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });
      if (error) throw error;
      return data || [];
    },
    enabled: queryEnabled,
  });

  const isLoading =
    isLoadingTicketsPerMonth ||
    isLoadingAvgResolutionTime ||
    isLoadingIssueCategories ||
    isLoadingTopRepairedAssets;

  const error =
    ticketsPerMonthError ||
    avgResolutionTimeError ||
    issueCategoriesError ||
    topRepairedAssetsError;

  const avgResolutionTimeKpi =
    avgResolutionTimeData && avgResolutionTimeData.length > 0
      ? avgResolutionTimeData[0].avg_time_hours
      : null;

  const issueCategoriesPieChartData =
    issueCategoriesData?.map((item, index) => {
      const colors = [
        'hsl(var(--chart-1))',
        'hsl(var(--chart-2))',
        'hsl(var(--chart-3))',
        'hsl(var(--chart-4))',
        'hsl(var(--chart-5))',
      ];
      return {
        name: item.category_name,
        value: Number(item.count),
        color: colors[index % colors.length],
      };
    }) || [];

  const avgResolutionTimeLineChartData =
    ticketsPerMonthData?.map((item) => ({
      month: item.month,
      avg_time_hours:
        avgResolutionTimeData && avgResolutionTimeData.length > 0
          ? avgResolutionTimeData[0].avg_time_hours
          : 0, // Placeholder, actual line chart data for avg resolution time would need per-month data
    })) || [];

  return {
    ticketsPerMonthData: ticketsPerMonthData || [],
    avgResolutionTimeData: avgResolutionTimeLineChartData, // Using ticketsPerMonth for X-axis consistency
    avgResolutionTimeKpi,
    issueCategoriesData: issueCategoriesPieChartData,
    topRepairedAssetsData: topRepairedAssetsData || [],
    isLoading,
    error,
  };
};
