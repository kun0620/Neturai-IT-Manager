import { AssetWithType } from '@/types/asset';

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

export function AssetStatusSection({ asset }: Props) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">Status</div>
      <div className="text-sm">{asset.status}</div>
    </div>
  );
}
