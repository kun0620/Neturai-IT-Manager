import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type AssetCategory = {
  id: string;
  name: string;
};

async function getAssetCategories(): Promise<AssetCategory[]> {
  const { data, error } = await supabase
    .from('asset_categories')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export function useAssetCategories() {
  return useQuery<AssetCategory[], Error>({
    queryKey: ['asset-categories'],
    queryFn: getAssetCategories,
  });
}
