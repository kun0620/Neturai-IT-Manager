import { AssetWithType } from '@/types/asset';
import { InlineEditableSelect } from '@/components/ui/inline-editable-select';
import { changeAssetStatus } from '@/features/assets/api/changeStatus';
import { useQueryClient } from '@tanstack/react-query';

type AssetStatus =
  | 'Available'
  | 'Assigned'
  | 'In Repair'
  | 'Retired'
  | 'Lost'
  | 'In Use';

type Props = {
  asset: AssetWithType;
  performedBy: string | null;
  onLocalUpdate: (next: AssetWithType) => void; // ✅ ต้องมี
};

const STATUS_OPTIONS: { value: AssetStatus; label: string }[] = [
  { value: 'Available', label: 'Available' },
  { value: 'Assigned', label: 'Assigned' },
  { value: 'In Repair', label: 'In Repair' },
  { value: 'Retired', label: 'Retired' },
  { value: 'Lost', label: 'Lost' },
  { value: 'In Use', label: 'In Use' },
];

export function AssetStatusSection({ asset, performedBy }: Props) {
  const qc = useQueryClient();

  async function onChange(next: AssetStatus | null) {
    if (!next || next === asset.status) return;

    await changeAssetStatus(
      asset.id,
      asset.status as AssetStatus,
      next,
      performedBy
    );

    await Promise.all([
      qc.invalidateQueries({ queryKey: ['assets'] }),
      qc.invalidateQueries({ queryKey: ['asset', asset.id] }),
      qc.invalidateQueries({ queryKey: ['asset-logs', asset.id] }),
    ]);
  }

  return (
    <div>
  <div className="text-xs text-muted-foreground">Status</div>
    <div className="text-sm">{asset.status}</div>
  </div>
  );
}
