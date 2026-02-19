import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Tables } from '@/types/supabase';

type Log = Tables<'logs'> & {
  profiles: Pick<Tables<'profiles'>, 'name' | 'email'> | null;
};

interface PaginatedLogs {
  data: Log[];
  count: number;
}

async function fetchLogs(
  page: number,
  limit: number,
  searchTerm: string
): Promise<PaginatedLogs> {
  const offset = (page - 1) * limit;

  let query = supabase
    .from('logs')
    .select(`
        *,
        profiles (
          name,
          email
        )
      `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (searchTerm) {
    query = query.or(
      `action.ilike.%${searchTerm}%,details::text.ilike.%${searchTerm}%`
    );
  }

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  return {
    data: data ?? [],
    count: count ?? 0,
  };
}

export function useLogs(
  page: number,
  limit: number,
  searchTerm: string,
  enabled = true
) {
  return useQuery<PaginatedLogs, Error>({
    queryKey: ['logs', page, limit, searchTerm],
    queryFn: () => fetchLogs(page, limit, searchTerm),
    enabled,
    placeholderData: (previousData) => previousData,
  });
}

