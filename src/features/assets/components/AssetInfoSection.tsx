import { AssetWithType } from '@/types/asset';

type Props = {
  asset: AssetWithType;
};

export function AssetInfoSection({ asset }: Props) {
  return (
    <div className="space-y-2">
      <div>
        <div className="text-xs text-muted-foreground">Name</div>
        <div className="font-medium">{asset.name}</div>
      </div>

      <div>
        <div className="text-xs text-muted-foreground">Asset Code</div>
        <div>{asset.asset_code}</div>
      </div>

      <div>
        <div className="text-xs text-muted-foreground">Type</div>
        <div>{asset.asset_type?.name ?? '—'}</div>
      </div>

      <div>
        <div className="text-xs text-muted-foreground">Category</div>
        <div>{asset.category?.name ?? '—'}</div>
      </div>

      <div>
        <div className="text-xs text-muted-foreground">Status</div>
        <div>{asset.status}</div>
      </div>
    </div>
  );
}
