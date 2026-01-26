import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type AssetType = {
  id: string;
  key: string;
  name: string;
  icon: string | null;
};

async function getAssetTypes(): Promise<AssetType[]> {
  const { data, error } = await supabase
    .from('asset_types')
    .select('id, key, name, icon')
    .order('name');

  if (error) throw error;
  return data ?? [];
}

export function useAssetTypes() {
  return useQuery<AssetType[], Error>({
    queryKey: ['asset-types'],
    queryFn: getAssetTypes,
  });
}
