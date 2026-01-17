import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AssetWithType, AssetType } from '@/types/asset';

async function getAssets(): Promise<AssetWithType[]> {
  const { data, error } = await supabase
    .from('assets')
    .select(`
      id,
      name,
      asset_code,
      category,
      status,
      location,
      assigned_to,
      created_at,
      updated_at,
      asset_type:asset_types (
        id,
        key,
        name,
        icon
      )
    `);

  if (error) {
    throw new Error(error.message);
  }

  // map เพื่อให้ type ชัด และไม่พึ่ง Supabase join typing
  return (data ?? []).map((row: any): AssetWithType => ({
    id: row.id,
    name: row.name,
    asset_code: row.asset_code,
    category: row.category,
    status: row.status,
    location: row.location,
    assigned_to: row.assigned_to,
    created_at: row.created_at,
    updated_at: row.updated_at,
    asset_type: row.asset_type
      ? {
          id: row.asset_type.id,
          key: row.asset_type.key,
          name: row.asset_type.name,
          icon: row.asset_type.icon,
        }
      : null,
  }));
}

export function useAssets() {
  return useQuery<AssetWithType[], Error>({
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
