import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AssetWithType } from '@/types/asset';

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

  if (error) throw error;

  return (data ?? []).map((row: any): AssetWithType => ({
    id: row.id,
    name: row.name,
    asset_code: row.asset_code,
    category: row.category,
    status: row.status,
    serial_number: row.serial_number,
    location: row.location,
    assigned_to: row.assigned_to,
    last_service_date: row.last_service_date,
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
