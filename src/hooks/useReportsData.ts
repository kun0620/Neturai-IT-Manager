import { useMemo } from 'react';
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

interface ClosedTicketResolution {
  created_at: string;
  updated_at: string;
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

  const { data: closedTicketsForResolution } = useQuery<ClosedTicketResolution[], Error>({
    queryKey: ['reports', 'closedTicketsResolution', startDate, endDate],
    queryFn: async () => {
      if (!startDate || !endDate) return [];
      const { data, error } = await supabase
        .from('tickets')
        .select('created_at, updated_at')
        .eq('status', 'closed')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
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

  // คำนวณ avg resolution time ต่อเดือนจาก closed tickets จริง
  const avgResolutionTimeLineChartData = useMemo(() => {
    if (!ticketsPerMonthData || ticketsPerMonthData.length === 0) return [];

    // จัด closed tickets เป็น groups ตาม YYYY-MM
    const monthlyHours: Record<string, number[]> = {};
    for (const ticket of closedTicketsForResolution || []) {
      const monthKey = ticket.created_at.slice(0, 7); // "YYYY-MM"
      const hours =
        (new Date(ticket.updated_at).getTime() - new Date(ticket.created_at).getTime()) /
        (1000 * 60 * 60);
      if (hours > 0) {
        if (!monthlyHours[monthKey]) monthlyHours[monthKey] = [];
        monthlyHours[monthKey].push(hours);
      }
    }

    return ticketsPerMonthData.map((item) => {
      // item.month อาจเป็น "YYYY-MM" หรือ "YYYY-MM-DD" — เอาแค่ 7 ตัวแรก
      const monthKey = String(item.month).slice(0, 7);
      const hours = monthlyHours[monthKey];
      const avg = hours && hours.length > 0
        ? hours.reduce((a, b) => a + b, 0) / hours.length
        : (avgResolutionTimeKpi ?? 0);
      return { month: item.month, avg_time_hours: Number(avg.toFixed(2)) };
    });
  }, [ticketsPerMonthData, closedTicketsForResolution, avgResolutionTimeKpi]);

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
