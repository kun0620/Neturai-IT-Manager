import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AssetWithType } from '@/types/asset';

type AssetQueryRow = {
  id: string;
  name: string;
  asset_code: string;
  serial_number: string | null;
  status: AssetWithType['status'];
  location: string | null;
  assigned_to: string | null;
  last_service_date: string | null;
  created_at: string | null;
  updated_at: string | null;

  asset_type: {
    id: string;
    key: string;
    name: string;
    icon: string | null;
  } | null;

  category: {
    id: string;
    name: string;
  } | null;
};
  
async function getAssets(): Promise<AssetWithType[]> {
  const { data, error } = await supabase
    .from('assets')
    .select(`
      id,
      name,
      asset_code,
      serial_number,
      status,
      location,
      assigned_to,
      last_service_date,
      created_at,
      updated_at,
      asset_type:asset_types(id, key, name, icon),
      category:asset_categories(id, name)
    `);

  if (error) throw error;

  return (data ?? []).map((row: AssetQueryRow): AssetWithType => ({
    id: row.id,
    name: row.name,
    asset_code: row.asset_code,
    serial_number: row.serial_number,
    category: row.category,
    status: row.status,
    location: row.location,
    assigned_to: row.assigned_to,
    last_service_date: row.last_service_date,
    created_at: row.created_at,
    updated_at: row.updated_at,
    asset_type: row.asset_type,
  }));
}

export function useAssets() {
  return useQuery<AssetWithType[], Error>({
    queryKey: ['assets'],
    queryFn: getAssets,
  });
}
