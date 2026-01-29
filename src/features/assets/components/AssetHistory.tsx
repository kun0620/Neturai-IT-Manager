import { useAssetLogs } from '../hooks/useAssetLogs';
import { AssetHistoryItem } from './AssetHistoryItem';
import { mapAssetLog } from '../utils/mapAssetLog';

type Props = {
  assetId: string;
};

export function AssetHistory({ assetId }: Props) {
  const { data = [], isLoading } = useAssetLogs(assetId);

  const items = data.map((log) => mapAssetLog(log));

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">
        Loading history…
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="text-sm text-muted-foreground">
        No history yet
      </div>
    );
  }

  return (
    <div>

      <div className="space-y-1">
        {items.map((item) => (
          <AssetHistoryItem key={item.id} log={item} />
        ))}
      </div>
    </div>
  );
}
