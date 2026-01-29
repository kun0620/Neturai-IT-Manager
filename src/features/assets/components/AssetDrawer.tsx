import { AssetWithType } from '@/types/asset';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

import { AssetDynamicSection } from './AssetDynamicSection';
import { AssetHistory } from './AssetHistory';

import { useAssetFields } from '@/hooks/useAssetFields';
import { useAssetFieldValues } from '@/hooks/useAssetFieldValues';
import { useCurrentProfile } from '@/hooks/useCurrentProfile';

/* ================= TYPES ================= */

type SimpleUser = {
  id: string;
  name: string;
};

type Props = {
  asset: AssetWithType | null;
  open: boolean;
  onClose: () => void;
  onEdit: (asset: AssetWithType) => void;
  users: SimpleUser[];
};


/* ================= COMPONENT ================= */

export function AssetDrawer({
  asset,
  open,
  onClose,
  onEdit,
  users,
}: Props) {
  if (!asset) return null;

  /* ---------- dynamic fields ---------- */
  const assetTypeId = asset.asset_type?.id;
  const { data: assetFields = [] } = useAssetFields(assetTypeId);
  const { data: rawCustomValues = {} } = useAssetFieldValues(asset.id);
  const { can } = useCurrentProfile();
  const canViewHistory = can('asset.history.view');
  const customValues: Record<string, string> = Object.fromEntries(
    Object.entries(rawCustomValues).map(([k, v]) => [k, v ?? ''])
  );

  const assignedUser =
    users.find((u) => u.id === asset.assigned_to)?.name ?? '—';

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[420px] p-0 flex flex-col">
        {/* ===== Header ===== */}
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle className="text-lg leading-tight">
            {asset.name}
          </SheetTitle>
          <div className="text-xs text-muted-foreground">
            {asset.asset_code}
          </div>
        </SheetHeader>

        {/* ===== Content ===== */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Info */}
          <section className="grid grid-cols-2 gap-x-6 gap-y-4">
            <InfoRow label="Category">
              {asset.category?.name ?? '—'}
            </InfoRow>

            <InfoRow label="Asset Type">
              {asset.asset_type?.name ?? '—'}
            </InfoRow>

            <InfoRow label="Status">
              {asset.status}
            </InfoRow>

            <InfoRow label="Assigned To">
              {assignedUser}
            </InfoRow>

            <InfoRow label="Location">
              {asset.location ?? '—'}
            </InfoRow>
          </section>

          {/* Specifications */}
          {assetFields.length > 0 && (
            <section className="rounded-md border p-4 space-y-3">
              <div className="text-sm font-semibold">
                Specifications
              </div>

              <AssetDynamicSection
                assetId={asset.id}
                fields={assetFields}
                values={customValues}
              />
            </section>
          )}

          {/* History */}
          {canViewHistory && (
            <section>
              <div className="mb-2 text-sm font-semibold">
                History
              </div>

              <div className="max-h-[260px] overflow-y-auto pr-2">
                <AssetHistory assetId={asset.id} />
              </div>
            </section>
          )}
        </div>

        {/* ===== Footer ===== */}
        <div className="border-t px-6 py-4 flex justify-end">
         {can('asset.edit') && (
          <Button
            size="sm"
            variant="default"
            onClick={() => {
              onClose();
              onEdit(asset);
            }}
          >
            Edit
          </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ================= HELPER ================= */

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">
        {label}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}
