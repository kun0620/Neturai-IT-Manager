import { AssetWithType } from '@/types/asset';

type User = { id: string; name: string };

type Props = {
  asset: AssetWithType;
  users: User[];
};

export function AssetAssignmentSection({
  asset,
  users,
}: Props) {
  const assignedUser =
    users.find((u) => u.id === asset.assigned_to)?.name ?? '—';

  return (
    <div>
      <div className="text-xs text-muted-foreground">Assigned To</div>
      <div className="text-sm">{assignedUser}</div>
    </div>
  );
}
