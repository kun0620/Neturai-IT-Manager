import { AssetWithType } from '@/types/asset';
import { AssetInfoSection } from './AssetInfoSection';
import { AssetHistory } from './AssetHistory';
import { AssetStatusSection } from './AssetStatusSection';
import { AssetAssignmentSection } from './AssetAssignmentSection';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

type Props = {
  asset: AssetWithType | null;
  open: boolean;
  onClose: () => void;
  users: { id: string; name: string }[];
  performedBy: string | null;
  onLocalUpdate: (next: AssetWithType) => void;
};

export function AssetDrawer({
  asset,
  open,
  onClose,
  users,
  performedBy,
  onLocalUpdate,
}: Props) {
  if (!asset) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[420px] space-y-6">
        <SheetHeader>
          <SheetTitle>Asset Detail</SheetTitle>
        </SheetHeader>

        <AssetInfoSection asset={asset} />

        <AssetStatusSection
          asset={asset}
          performedBy={performedBy}
          onLocalUpdate={onLocalUpdate}
        />

        <AssetAssignmentSection
          asset={asset}
          users={users}
          performedBy={performedBy}
          onLocalUpdate={onLocalUpdate}
        />

        <AssetHistory assetId={asset.id} />
      </SheetContent>
    </Sheet>
  );
}
