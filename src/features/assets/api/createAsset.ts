import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
import { insertAssetLogs } from '@/services/assetLogs';

type AssetInsert =
  Database['public']['Tables']['assets']['Insert'];

export async function createAsset(
  payload: AssetInsert,
  performedBy: string | null
) {
  const { data, error } = await supabase
    .from('assets')
    .insert(payload)
    .select('id')
    .single();

  if (error) throw error;

  await insertAssetLogs([
    {
      assetId: data.id,
      action: 'create',
      field: '*',
      oldValue: null,
      newValue: 'created',
      performedBy,
    },
  ]);

  return data;
}
