import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
import { diffAsset } from '@/utils/diffAsset';
import { insertAssetLogs } from '@/services/assetLogs';

type AssetRow =
  Database['public']['Tables']['assets']['Row'];
type AssetUpdate =
  Database['public']['Tables']['assets']['Update'];

const LOG_FIELDS: (keyof AssetRow)[] = [
  'name',
  'asset_code',
  'status',
  'location',
  'assigned_to',
  'category_id',
  'asset_type_id',
];

export async function updateAsset(
  assetId: string,
  before: AssetRow,
  after: AssetUpdate,
  performedBy: string | null
) {
  // 1️⃣ Update asset
  const { error } = await supabase
    .from('assets')
    .update(after)
    .eq('id', assetId);

  if (error) throw error;

  // 2️⃣ Merge เพื่อ diff
  const merged = {
    ...before,
    ...after,
  };

  const diffs = diffAsset(
    before as Record<keyof AssetRow, unknown>,
    merged as Record<keyof AssetRow, unknown>,
    LOG_FIELDS
  );

  // 3️⃣ ไม่มี diff → ไม่ต้อง log
  if (diffs.length === 0) return;

  // 4️⃣ Write logs (intent-based)
  await insertAssetLogs(
    diffs.map((d) => ({
      assetId,
      action: d.field === 'status' ? 'status_change' : 'update',
      field: d.field,
      oldValue: d.oldValue,
      newValue: d.newValue,
      performedBy,
    }))
  );
}

