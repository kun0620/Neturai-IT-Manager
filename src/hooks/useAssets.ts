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
