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
  if (newUserId) {
    const { data: targetAsset, error: targetError } = await supabase
      .from('assets')
      .select(
        `
        id,
        asset_type:asset_types(key, name)
      `
      )
      .eq('id', assetId)
      .maybeSingle();

    if (targetError) throw targetError;

    const targetTypeKey = targetAsset?.asset_type?.key?.toLowerCase() ?? '';
    const targetTypeName = targetAsset?.asset_type?.name?.toLowerCase() ?? '';
    const isPrimaryDevice =
      targetTypeKey === 'laptop' ||
      targetTypeKey === 'desktop' ||
      targetTypeName === 'laptop' ||
      targetTypeName === 'desktop';

    if (isPrimaryDevice) {
      const { data: currentAssets, error: currentError } = await supabase
        .from('assets')
        .select(
          `
          id,
          asset_type:asset_types(key, name)
        `
        )
        .eq('assigned_to', newUserId);

      if (currentError) throw currentError;

      const hasPrimaryDevice = (currentAssets ?? []).some((asset) => {
        if (asset.id === assetId) return false;
        const typeKey = asset.asset_type?.key?.toLowerCase() ?? '';
        const typeName = asset.asset_type?.name?.toLowerCase() ?? '';
        return (
          typeKey === 'laptop' ||
          typeKey === 'desktop' ||
          typeName === 'laptop' ||
          typeName === 'desktop'
        );
      });

      if (hasPrimaryDevice) {
        throw new Error('This user already has a laptop/desktop assigned.');
      }
    }
  }

  const update: AssetUpdate = {
    assigned_to: newUserId,
    status: newUserId ? 'Assigned' : 'Available',
  };

  const { error } = await supabase
    .from('assets')
    .update(update)
    .eq('id', assetId);

  if (error) throw error;

  if (oldUserId) {
    const { error: clearError } = await supabase
      .from('profiles')
      .update({ assigned_asset_id: null })
      .eq('id', oldUserId);
    if (clearError) throw clearError;
  }

  if (newUserId) {
    const { error: assignError } = await supabase
      .from('profiles')
      .update({ assigned_asset_id: assetId })
      .eq('id', newUserId);
    if (assignError) throw assignError;
  }

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
