import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
import { insertAssetLogs } from '@/services/assetLogs';

type AssetStatus = Database['public']['Enums']['asset_status'];

export async function changeAssetStatus(
  assetId: string,
  oldStatus: AssetStatus | null,
  newStatus: AssetStatus,
  performedBy: string | null
) {
  const update = { status: newStatus };

  const { error } = await supabase
    .from('assets')
    .update(update)
    .eq('id', assetId);

  if (error) throw error;

  await insertAssetLogs([
    {
      assetId,
      action: 'status_change',
      field: 'status',
      oldValue: oldStatus,
      newValue: newStatus,
      performedBy,
    },
  ]);
}

