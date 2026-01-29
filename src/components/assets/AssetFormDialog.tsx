import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { AssetWithType } from '@/types/asset';
import { UserProfile } from '@/hooks/useUsers';
import { useAssetTypes } from '@/hooks/useAssetTypes';
import { useAssetFields } from '@/hooks/useAssetFields';
import { useAssetFieldValues } from '@/hooks/useAssetFieldValues';
import { saveAssetFieldValues } from '@/hooks/useSaveAssetFieldValues';
import { DynamicAssetFields } from './DynamicAssetFields';
import { updateAsset } from '@/features/assets/api/updateAsset';
import { useAuth } from '@/context/AuthContext';
import { useAssetCategories } from '@/hooks/useAssetCategories';
import { CATEGORY_TYPE_MAP } from '@/features/assets/constants/categoryTypeMap';
import { useCurrentProfile } from '@/hooks/useCurrentProfile';


/* ================= ENUM ================= */

const AssetStatusEnum = {
  Available: 'Available',
  Assigned: 'Assigned',
  InRepair: 'In Repair',
  Retired: 'Retired',
  Lost: 'Lost',
} as const;

type AssetStatus =
  (typeof AssetStatusEnum)[keyof typeof AssetStatusEnum];

/* ================= SCHEMA ================= */

const assetFormSchema = z.object({
  name: z.string().min(1),
  asset_code: z.string().min(1),
  asset_type_id: z.string().uuid(),
  category_id: z.string().uuid().nullable().optional(),
  status: z.nativeEnum(AssetStatusEnum),
  assigned_to: z.string().uuid().nullable().optional(),
  serial_number: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  last_service_date: z.date().nullable().optional(),
  custom: z.record(z.string(), z.string()).optional(),
});

type AssetFormValues = z.infer<typeof assetFormSchema>;

/* ================= PROPS ================= */

interface AssetFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  asset?: AssetWithType | null;
  users: UserProfile[];
}

/* ================= COMPONENT ================= */

export function AssetFormDialog({
  isOpen,
  onClose,
  asset,
  users,
}: AssetFormDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { can } = useCurrentProfile();
  const { data: assetTypes = [] } = useAssetTypes();
  const { data: categories = [] } = useAssetCategories();
  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      name: '',
      asset_code: '',
      asset_type_id: '',
      category_id: null,
      status: AssetStatusEnum.Available,
      assigned_to: null,
      serial_number: '',
      location: '',
      last_service_date: null,
      custom: {},
    },
  });

  /* ---------- dynamic ---------- */

  const assetTypeId = form.watch('asset_type_id');
  const { data: assetFields = [] } = useAssetFields(assetTypeId);
  const { data: customValues } = useAssetFieldValues(asset?.id);
  const assignedTo = form.watch('assigned_to');
  const status = form.watch('status');
  const categoryId = form.watch('category_id');
  const canEditAsset = can('asset.edit');

  useEffect(() => {
    if (assignedTo && status !== 'Assigned') {
      form.setValue('status', 'Assigned');
    }

    if (!assignedTo && status === 'Assigned') {
      form.setValue('status', 'Available');
    }
  }, [assignedTo, status, form]);


  useEffect(() => {
  if (!categoryId) return;

  const suggestedType = CATEGORY_TYPE_MAP[categoryId];
  if (!suggestedType) return;

  const currentType = form.getValues('asset_type_id');
  if (!currentType) {
    form.setValue('asset_type_id', suggestedType);
  }
}, [categoryId, form]);

  /* ---------- RESET (สำคัญที่สุด) ---------- */

  useEffect(() => {
    if (!isOpen) return;

    if (asset) {
      form.reset({
        name: asset.name,
        asset_code: asset.asset_code,
        asset_type_id: asset.asset_type?.id ?? '',
        category_id: asset.category?.id ?? null,
        status: asset.status as AssetStatus,
        assigned_to: asset.assigned_to ?? null,
        serial_number: asset.serial_number ?? '',
        location: asset.location ?? '',
        last_service_date:
          typeof asset.last_service_date === 'string'
            ? new Date(asset.last_service_date)
            : null,
        custom: {}, // ❗ reset เปล่าเสมอ
      });
    } else {
      form.reset();
    }
  }, [asset, isOpen, form]);

  /* ---------- APPLY CUSTOM VALUES ทีหลัง ---------- */

  useEffect(() => {
    if (!customValues) return;

    Object.entries(customValues).forEach(([key, value]) => {
      form.setValue(`custom.${key}`, value ?? '');
    });
  }, [customValues, form]);

  /* ================= MUTATION ================= */

  type AssetPayload = {
    name: string;
    asset_code: string;
    asset_type_id: string;
    category_id: string | null;
    status: AssetStatus;
    assigned_to: string | null;
    serial_number: string | null;
    location: string | null;
    last_service_date: string | null;
  };

  const saveAssetMutation = useMutation<string, Error, AssetFormValues>({
    mutationFn: async (values) => {
      const payload: AssetPayload = {
        name: values.name,
        asset_code: values.asset_code,
        asset_type_id: values.asset_type_id,
        category_id: values.category_id ?? null,
        status: values.status,
        assigned_to: values.assigned_to ?? null,
        serial_number: values.serial_number ?? null,
        location: values.location ?? null,
        last_service_date: values.last_service_date
          ? format(values.last_service_date, 'yyyy-MM-dd')
          : null,
      };

      let id: string;

      if (asset) {
          await updateAsset(
            asset.id,
            asset as any,
            payload,
            user?.id ?? null
          );
          id = asset.id;
        }
        else {
        const { data, error } = await supabase
          .from('assets')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        id = data.id;
      }

      await saveAssetFieldValues({
        assetId: id,
        values: values.custom ?? {},
        fields: assetFields,
      });

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success(
        asset ? 'Asset updated successfully' : 'Asset created successfully'
      );

      form.reset();
      onClose(); // ✅ ปิดจากตรงนี้เท่านั้น
    },
  });

  const handleSubmit = (values: AssetFormValues) => {
    if (!can('asset.edit')) {
      toast.error('You do not have permission to edit assets.');
      return;
    }

    saveAssetMutation.mutate(values);
  };

  /* ================= UI ================= */

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">

        {!canEditAsset ? (
          // 🔒 NO PERMISSION STATE
          <div className="py-8 text-center text-muted-foreground">
            You do not have permission to edit assets.
          </div>
        ) : (
          // ✅ NORMAL FORM
          <>
            <DialogHeader>
              <DialogTitle>
                {asset ? 'Edit Asset' : 'Add New Asset'}
              </DialogTitle>
              <DialogDescription>
                Manage asset information
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="grid gap-4 py-4"
            >
          <FormRow label="Name">
            <Input {...form.register('name')} />
          </FormRow>

          <FormRow label="Asset Code">
            <Input {...form.register('asset_code')} />
          </FormRow>
          <FormRow label="Category">
            <Select
              value={form.watch('category_id') ?? ''}
              onValueChange={(v) =>
                form.setValue('category_id', v || null)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>
          <FormRow label="Asset Type">
            <Select value={assetTypeId} onValueChange={(v) => form.setValue('asset_type_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select asset type" />
              </SelectTrigger>
              <SelectContent>
                {assetTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>

          <FormRow label="Status">
            <Select value={form.watch('status')} onValueChange={(v) => form.setValue('status', v as AssetStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(AssetStatusEnum).map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>
          <FormRow label="Assigned To">
            <Select
              value={form.watch('assigned_to') ?? ''}
              onValueChange={(v) =>
                form.setValue('assigned_to', v || null)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {users
                  .filter((u) => u.name)
                  .map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </FormRow>
          <FormRow label="Location">
            <Input
              placeholder="e.g. Office, Warehouse, Floor 2"
              {...form.register('location')}
            />
          </FormRow>
          <FormRow label="Serial Number">
            <Input
              placeholder="Serial / S/N"
              {...form.register('serial_number')}
            />
          </FormRow>


          {assetTypeId && (
            <DynamicAssetFields
              key={assetTypeId}
              fields={assetFields}
              control={form.control}
            />
          )}

          <DialogFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset();
                    onClose();
                  }}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={saveAssetMutation.isPending}
                >
                  {saveAssetMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {asset ? 'Save Changes' : 'Add Asset'}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}

      </DialogContent>
    </Dialog>
  );
}

/* ================= HELPER ================= */

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-4 items-center gap-4">
      <Label className="text-right">{label}</Label>
      <div className="col-span-3">{children}</div>
    </div>
  );
}
