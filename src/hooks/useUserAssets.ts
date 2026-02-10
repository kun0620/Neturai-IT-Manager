import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { AssetWithType } from '@/types/asset';

const selectFields = `
  id,
  name,
  asset_code,
  status,
  location,
  serial_number,
  assigned_to,
  created_at,
  updated_at,
  asset_type:asset_types(id, key, name, icon),
  category:asset_categories(id, name)
`;

async function fetchAssignedAssets(userId: string): Promise<AssetWithType[]> {
  const { data, error } = await supabase
    .from('assets')
    .select(selectFields)
    .eq('assigned_to', userId);

  if (error) throw error;

  return (data ?? []).map((row): AssetWithType => ({
    id: row.id,
    name: row.name,
    asset_code: row.asset_code,
    category: row.category,
    status: row.status,
    serial_number: row.serial_number ?? null,
    location: row.location,
    assigned_to: row.assigned_to,
    last_service_date: null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    asset_type: row.asset_type,
  }));
}

export function useUserAssets() {
  const { user } = useAuth();

  return useQuery<AssetWithType[], Error>({
    queryKey: ['user-assets', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => fetchAssignedAssets(user?.id ?? ''),
  });
}
