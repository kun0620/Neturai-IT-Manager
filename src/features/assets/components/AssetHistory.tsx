import { useAssetLogs } from '@/features/assets/hooks/useAssetLogs';
import { logMessage } from '@/features/assets/utils/logMessage';

type Props = {
  assetId: string;
};

export function AssetHistory({ assetId }: Props) {
  const { data, isLoading } = useAssetLogs(assetId);

  if (isLoading) return <div>Loading history...</div>;
  if (!data || data.length === 0)
    return <div className="text-sm text-muted-foreground">No history</div>;

  return (
    <div className="space-y-3">
      {data.map((log) => (
        <div key={log.id} className="border-l pl-3">
          <div className="text-sm">
            {logMessage(log)}
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date(log.created_at!).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
