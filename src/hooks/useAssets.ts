import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Tables } from '@/types/supabase';

async function getAssets(): Promise<Tables<'assets'>[]> {
  const { data, error } = await supabase.from('assets').select('*');

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export function useAssets() {
  return useQuery<Tables<'assets'>[], Error>({
    queryKey: ['assets'],
    queryFn: getAssets,
  });
}

export const fetchTotalAssets = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('assets')
    .select('id', { count: 'exact' });
  if (error) throw new Error(error.message);
  return count || 0;
};

export const useTotalAssets = () => {
  return useQuery<number, Error>({
    queryKey: ['totalAssets'],
    queryFn: fetchTotalAssets,
  });
};
