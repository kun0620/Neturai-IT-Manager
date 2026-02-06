import { useAssetLogs } from '../hooks/useAssetLogs';
import { AssetHistoryItem } from './AssetHistoryItem';
import { mapAssetLog } from '../utils/mapAssetLog';
import { useUserNames } from '../hooks/useUserNames';

type Props = {
  assetId: string;
};

export function AssetHistory({ assetId }: Props) {
  const { data = [], isLoading } = useAssetLogs(assetId);
  const { nameMap } = useUserNames(
    data.map((log) => log.performed_by)
  );

  const items = data.map((log) =>
    mapAssetLog(log, (id) => (id ? nameMap[id] ?? null : null))
  );

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
