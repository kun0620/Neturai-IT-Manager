import { Button } from '@/components/ui/button';
import { AssetWithType } from '@/types/asset';
import { assignAsset } from '@/features/assets/api/assignAsset';
import { useQueryClient } from '@tanstack/react-query';

type User = { id: string; name: string };

type Props = {
  asset: AssetWithType;
  users: User[];
  performedBy: string | null;
  onLocalUpdate: (next: AssetWithType) => void;
};


export function AssetAssignmentSection({
  asset,
  users,
  performedBy,
  onLocalUpdate,
}: Props) {
  const qc = useQueryClient();

  async function onAssign(userId: string | null) {
    await assignAsset(
      asset.id,
      asset.assigned_to,
      userId,
      performedBy
    );
    // ✅ sync state ใน Drawer ทันที
    onLocalUpdate({
      ...asset,
      assigned_to: userId,
    });

    await Promise.all([
      qc.invalidateQueries({ queryKey: ['assets'] }),
      qc.invalidateQueries({ queryKey: ['asset-logs', asset.id] }),
    ]);
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Assignment</div>

      <div className="flex flex-wrap gap-2">
        {users.map((u) => (
          <Button
            key={u.id}
            size="sm"
            variant={asset.assigned_to === u.id ? 'default' : 'outline'}
            onClick={() => onAssign(u.id)}
          >
            {u.name}
          </Button>
        ))}

        <Button
          size="sm"
          variant="outline"
          onClick={() => onAssign(null)}
        >
          Unassign
        </Button>
      </div>
    </div>
  );
}
