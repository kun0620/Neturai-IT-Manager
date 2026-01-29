import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
import { insertAssetLogs } from '@/services/assetLogs';

type AssetUpdate =
  Database['public']['Tables']['assets']['Update'];

export async function assignAsset(
  assetId: string,
  oldUserId: string | null,
  newUserId: string | null,
  performedBy: string | null
) {
  const update: AssetUpdate = {
    assigned_to: newUserId,
    status: newUserId ? 'Assigned' : 'Available',
  };

  const { error } = await supabase
    .from('assets')
    .update(update)
    .eq('id', assetId);

  if (error) throw error;

  await insertAssetLogs([
    {
      assetId,
      action: newUserId ? 'assign' : 'unassign',
      field: 'assigned_to',
      oldValue: oldUserId,
      newValue: newUserId,
      performedBy,
    },
    {
      assetId,
      action: 'status_change',
      field: 'status',
      oldValue: oldUserId ? 'Assigned' : 'Available',
      newValue: newUserId ? 'Assigned' : 'Available',
      performedBy,
    },
  ]);
}
