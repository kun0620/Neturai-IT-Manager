import { useQuery } from '@tanstack/react-query';
import { getAssetLogs } from '@/features/assets/api/getAssetLogs';

export function useAssetLogs(assetId: string) {
  return useQuery({
    queryKey: ['asset-logs', assetId],
    queryFn: () => getAssetLogs(assetId),
    enabled: !!assetId,
  });
}
