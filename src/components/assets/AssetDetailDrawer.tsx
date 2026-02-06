import React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Asset } from '@/types/supabase';
import { UserProfile } from '@/hooks/useUsers';
import { AssetHistoryTimeline } from '@/features/assets/components/AssetHistoryTimeline';


type AssetWithUser = Asset & {
  users: { name: string } | null; // Changed from profiles to users
};

interface AssetDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  asset: AssetWithUser;
  users: UserProfile[]; // Not directly used here, but passed from parent
}

export const AssetDetailDrawer: React.FC<AssetDetailDrawerProps> = ({
  isOpen,
  onClose,
  asset,
}) => {
  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="h-[90%]">
        <ScrollArea className="h-full">
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader>
              <DrawerTitle>{asset.name} ({asset.asset_code})</DrawerTitle>
              <DrawerDescription>Details and history of this asset.</DrawerDescription>
            </DrawerHeader>
            <div className="p-4 pb-0">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-1">
                  <span className="font-medium">Category:</span>
                  <span>{asset.category}</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <span className="font-medium">Status:</span>
                  <span>
                    <Badge
                      variant={
                        asset.status === 'Available'
                          ? 'default'
                          : asset.status === 'Assigned'
                          ? 'secondary'
                          : asset.status === 'In Repair'
                          ? 'outline'
                          : 'destructive'
                      }
                    >
                      {asset.status}
                    </Badge>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <span className="font-medium">Assigned To:</span>
                  <span>{asset.users?.name || 'Unassigned'}</span> {/* Changed to asset.users?.name */}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <span className="font-medium">Serial Number:</span>
                  <span>{asset.serial_number || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <span className="font-medium">Location:</span>
                  <span>{asset.location || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <span className="font-medium">Last Service Date:</span>
                  <span>
                    {asset.last_service_date ? format(new Date(asset.last_service_date), 'PPP') : 'N/A'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <span className="font-medium">Created At:</span>
                  <span>{format(new Date(asset.created_at!), 'PPP p')}</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <span className="font-medium">Updated At:</span>
                  <span>{asset.updated_at ? format(new Date(asset.updated_at), 'PPP p') : 'N/A'}</span>
                </div>
              </div>

              <Separator className="my-6" />

                <h3 className="text-lg font-semibold mb-4">
                  Activity
                </h3>

                <AssetHistoryTimeline assetId={asset.id} />

                <Separator className="my-6" />

                <h3 className="text-lg font-semibold mb-4">
                  Repair History
                </h3>

                <p className="text-muted-foreground">
                  No repair history available yet.
                </p>

            </div>
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
};
