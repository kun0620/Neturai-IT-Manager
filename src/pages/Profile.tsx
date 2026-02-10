import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserAssets } from '@/hooks/useUserAssets';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import type { AssetWithType } from '@/types/asset';

const formatAssignedAssetLabel = (asset: AssetWithType) =>
  `${asset.name}${asset.asset_code ? ` (${asset.asset_code})` : ''}`;

const resolveAssetDetails = (asset: AssetWithType): string | null => {
  const pieces: string[] = [];
  if (asset.asset_type?.name) pieces.push(asset.asset_type.name);
  if (asset.serial_number) {
    pieces.push(`SN ${asset.serial_number}`);
  } else if (asset.asset_code) {
    pieces.push(asset.asset_code);
  }
  return pieces.length ? pieces.join(' - ') : null;
};

export function ProfilePage() {
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const {
    data: assignedAssets = [],
    isLoading: assignedAssetsLoading,
  } = useUserAssets();
  const profileValues = {
    full_name: profile?.full_name ?? '',
    department: profile?.department ?? '',
    location: profile?.location ?? '',
    phone: profile?.preferred_contact ?? '',
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-12">
          <div className="w-full space-y-6">
            <div className="h-8 w-1/3 rounded bg-muted animate-pulse"></div>
            <div className="h-5 w-1/2 rounded bg-muted animate-pulse"></div>
            <LoadingSkeleton count={4} className="md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2" />
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-12">
        <div className="grid w-full gap-8 md:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <div className="space-y-2 text-center md:text-left">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Neturai IT Manager
            </p>
            <h1 className="text-2xl font-semibold text-foreground">My Profile</h1>
            <p className="text-sm text-muted-foreground">
              Tell us where you work and what you work on.
            </p>
          </div>

          <Card className="border-muted/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Profile Details</CardTitle>
              <CardDescription className="text-sm">
                Share display info, department, and hardware so IT can assist faster.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Full Name</Label>
                  <Input placeholder="Gun Pinit" value={profileValues.full_name} disabled />
                </div>
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input value={user?.email ?? ''} disabled />
                  <p className="text-xs text-muted-foreground">
                    We take your email from authentication - contact admin to update details.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label>Department</Label>
                  <Input placeholder="IT Support" value={profileValues.department} disabled />
                </div>
                <div className="grid gap-2">
                  <Label>Location</Label>
                  <Input placeholder="Head Office / Bangkok" value={profileValues.location} disabled />
                </div>
                <div className="grid gap-2">
                  <Label>Phone Number</Label>
                  <p className="text-xs text-muted-foreground">
                    Contact admin to update this number.
                  </p>
                  <Input
                    type="tel"
                    placeholder="081-234-5678"
                    value={profileValues.phone}
                    disabled
                  />
                </div>
                <Button type="button" className="w-full" disabled>
                  Read only
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
          <div className="space-y-6">
            <Card className="border-muted/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Assigned Devices</CardTitle>
                <CardDescription className="text-sm">
                  Devices currently assigned to your account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {assignedAssetsLoading && (
                  <div className="space-y-3">
                    <div className="h-16 rounded-md bg-muted animate-pulse"></div>
                    <div className="h-16 rounded-md bg-muted animate-pulse"></div>
                  </div>
                )}
                {!assignedAssetsLoading && assignedAssets.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No assets assigned yet.
                  </p>
                )}
                {!assignedAssetsLoading &&
                  assignedAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="rounded-md border bg-muted/40 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">
                          {formatAssignedAssetLabel(asset)}
                        </p>
                        {asset.id === profile?.assigned_asset_id && (
                          <Badge variant="secondary">Primary</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Type: {asset.asset_type?.name ?? ' - '}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Details: {resolveAssetDetails(asset) ?? ' - '}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Status: {asset.status}
                      </p>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
