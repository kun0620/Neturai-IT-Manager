import { AssetWithType } from '@/types/asset';
import { InlineEditableText } from '@/components/ui/inline-editable-text';
import { InlineEditableSelect } from '@/components/ui/inline-editable-select';
import { updateAsset } from '@/features/assets/api/updateAsset';
import { useQueryClient } from '@tanstack/react-query';

import { useAssetCategories } from '@/hooks/useAssetCategories';
import { useAssetTypes } from '@/hooks/useAssetTypes';
import { notifyError, notifySuccess } from '@/lib/notify';
import type { Database } from '@/types/supabase';


type Props = {
  asset: AssetWithType;
  performedBy: string | null;
  onLocalUpdate: (next: AssetWithType) => void;
};

export function AssetInfoSection({
  asset,
  performedBy,
  onLocalUpdate,
}: Props) {
  const qc = useQueryClient();
  const assetRow = asset as unknown as Database['public']['Tables']['assets']['Row'];

  /* ---------- data ---------- */
  const { data: categories = [] } = useAssetCategories();
  const { data: assetTypes = [] } = useAssetTypes();

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const typeOptions = assetTypes.map((t) => ({
    value: t.id,
    label: t.name,
  }));

  /* ---------- helpers ---------- */

  async function updateField(
    field: 'name' | 'location',
    next: string | null
  ) {
    if (next === asset[field]) return;

    const updates = { [field]: next } as Database['public']['Tables']['assets']['Update'];

    await updateAsset(
      asset.id,
      assetRow,
      updates,
      performedBy
    );

    onLocalUpdate({
      ...asset,
      [field]: next,
    });

    await Promise.all([
      qc.invalidateQueries({ queryKey: ['assets'] }),
      qc.invalidateQueries({ queryKey: ['asset-logs', asset.id] }),
    ]);
  }

  async function updateRelation(
    field: 'category_id' | 'asset_type_id',
    nextId: string | null
  ) {
    if (nextId === assetRow[field]) return;

    const updates = { [field]: nextId } as Database['public']['Tables']['assets']['Update'];

    await updateAsset(
      asset.id,
      assetRow,
      updates,
      performedBy
    );

    onLocalUpdate({
      ...asset,
      ...(field === 'category_id'
        ? { category: categories.find((c) => c.id === nextId) ?? null }
        : {}),
      ...(field === 'asset_type_id'
        ? { asset_type: assetTypes.find((t) => t.id === nextId) ?? null }
        : {}),
    });

    await Promise.all([
      qc.invalidateQueries({ queryKey: ['assets'] }),
      qc.invalidateQueries({ queryKey: ['asset-logs', asset.id] }),
    ]);
  }

  async function updateAssetCode(next: string | null) {
    if (!next || next === asset.asset_code) return;

    try {
      await updateAsset(
        asset.id,
        assetRow,
        { asset_code: next },
        performedBy
      );

      onLocalUpdate({
        ...asset,
        asset_code: next,
      });

      await Promise.all([
        qc.invalidateQueries({ queryKey: ['assets'] }),
        qc.invalidateQueries({ queryKey: ['asset-logs', asset.id] }),
      ]);

      notifySuccess('Asset Code updated');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '';
      // 🔥 กรณีซ้ำ
      if (message.includes('duplicate')) {
        notifyError('Asset Code already exists');
      } else {
        notifyError('Failed to update Asset Code');
      }
    }
  }

  /* ---------- UI ---------- */

  return (
    <div className="space-y-3">
      {/* Name */}
      <div>
        <div className="text-xs text-muted-foreground">Name</div>
        <InlineEditableText
          value={asset.name}
          onSave={(v) => updateField('name', v)}
        />
      </div>

      {/* Asset Code */}
      <div>
        <div className="text-xs text-muted-foreground">Asset Code</div>
        <InlineEditableText
          value={asset.asset_code}
          onSave={updateAssetCode}
        />
      </div>


      {/* Category */}
      <div>
        <div className="text-xs text-muted-foreground">Category</div>
        <InlineEditableSelect
          value={asset.category?.id ?? null}
          options={categoryOptions}
          placeholder="Select category"
          onSave={(v) => updateRelation('category_id', v)}
        />
      </div>

      {/* Asset Type */}
      <div>
        <div className="text-xs text-muted-foreground">Asset Type</div>
        <InlineEditableSelect
          value={asset.asset_type?.id ?? null}
          options={typeOptions}
          placeholder="Select asset type"
          onSave={(v) => updateRelation('asset_type_id', v)}
        />
      </div>

      {/* Location */}
      <div>
        <div className="text-xs text-muted-foreground">Location</div>
        <InlineEditableText
          value={asset.location}
          placeholder="—"
          onSave={(v) => updateField('location', v)}
        />
      </div>
    </div>
  );
}
