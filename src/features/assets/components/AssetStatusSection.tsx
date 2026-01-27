import { Button } from '@/components/ui/button';
import { AssetWithType } from '@/types/asset';
import { changeAssetStatus } from '@/features/assets/api/changeStatus';
import { useQueryClient } from '@tanstack/react-query';
import { Database } from '@/types/supabase';

type AssetStatus = Database['public']['Enums']['asset_status'];

const STATUSES: AssetStatus[] = [
  'Available',
  'In Use',
  'Assigned',
  'In Repair',
  'Retired',
  'Lost',
];

type Props = {
  asset: AssetWithType;
  performedBy: string | null;
  onLocalUpdate: (next: AssetWithType) => void;
};

export function AssetStatusSection({
  asset,
  performedBy,
  onLocalUpdate,
}: Props) {
  const qc = useQueryClient();

  async function onChangeStatus(next: AssetStatus) {
    if (next === asset.status) return;

    await changeAssetStatus(
      asset.id,
      asset.status as AssetStatus,
      next,
      performedBy
    );

    // ✅ อัปเดต asset ใน Drawer ทันที
    onLocalUpdate({
      ...asset,
      status: next,
    });

    // รีเฟรช list + history
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['assets'] }),
      qc.invalidateQueries({ queryKey: ['asset-logs', asset.id] }),
    ]);
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Status</div>
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={s === asset.status ? 'default' : 'outline'}
            onClick={() => onChangeStatus(s)}
          >
            {s}
          </Button>
        ))}
      </div>
    </div>
  );
}
