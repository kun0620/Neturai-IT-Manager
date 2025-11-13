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
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { TablesInsert, Tables } from '@/types/supabase'; // Removed Enums
import { UserProfile } from '@/hooks/useUsers'; // Assuming UserProfile type is defined here

// Manually define runtime enums for Zod validation
const AssetCategoryEnum = {
  Laptop: 'Laptop',
  Desktop: 'Desktop',
  Monitor: 'Monitor',
  Printer: 'Printer',
  NetworkDevice: 'Network Device',
  SoftwareLicense: 'Software License',
  Other: 'Other',
} as const;

const AssetStatusEnum = {
  Available: 'Available',
  Assigned: 'Assigned',
  InRepair: 'In Repair',
  Retired: 'Retired',
  Lost: 'Lost',
} as const;

const assetFormSchema = z.object({
  name: z.string().min(1, { message: 'Asset name is required.' }),
  asset_code: z.string().min(1, { message: 'Asset code is required.' }),
  category: z.nativeEnum(AssetCategoryEnum, { message: 'Please select a category.' }),
  status: z.nativeEnum(AssetStatusEnum, { message: 'Please select a status.' }),
  assigned_to: z.string().uuid().nullable().optional(),
  serial_number: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  last_service_date: z.date().nullable().optional(),
});

type AssetFormValues = z.infer<typeof assetFormSchema>;
type Asset = Tables<'assets'>; // Use Tables type from supabase.ts

interface AssetFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  asset?: Asset | null;
  users: UserProfile[];
}

export const AssetFormDialog: React.FC<AssetFormDialogProps> = ({
  isOpen,
  onClose,
  asset,
  users,
}) => {
  const queryClient = useQueryClient();
  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      name: asset?.name || '',
      asset_code: asset?.asset_code || '',
      category: asset?.category || AssetCategoryEnum.Other, // Use runtime enum
      status: asset?.status || AssetStatusEnum.Available, // Use runtime enum
      assigned_to: asset?.assigned_to || null,
      serial_number: asset?.serial_number || '',
      location: asset?.location || '',
      last_service_date: asset?.last_service_date ? new Date(asset.last_service_date) : null,
    },
  });

  useEffect(() => {
    if (asset) {
      form.reset({
        name: asset.name,
        asset_code: asset.asset_code,
        category: asset.category,
        status: asset.status,
        assigned_to: asset.assigned_to,
        serial_number: asset.serial_number,
        location: asset.location,
        last_service_date: asset.last_service_date ? new Date(asset.last_service_date) : null,
      });
    } else {
      form.reset({
        name: '',
        asset_code: '',
        category: AssetCategoryEnum.Other,
        status: AssetStatusEnum.Available,
        assigned_to: null,
        serial_number: '',
        location: '',
        last_service_date: null,
      });
    }
  }, [asset, form]);

  const createAssetMutation = useMutation<void, Error, TablesInsert<'assets'>>({
    mutationFn: async (newAsset) => {
      const { error } = await supabase.from('assets').insert(newAsset);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Asset Created', {
        description: 'The new asset has been successfully added.',
      });
      onClose();
    },
    onError: (error) => {
      toast.error('Failed to Create Asset', {
        description: error.message,
      });
    },
  });

  const updateAssetMutation = useMutation<void, Error, TablesInsert<'assets'>>({
    mutationFn: async (updatedAsset) => {
      if (!asset?.id) throw new Error('Asset ID is missing for update.');
      const { error } = await supabase.from('assets').update(updatedAsset).eq('id', asset.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Asset Updated', {
        description: 'The asset details have been successfully updated.',
      });
      onClose();
    },
    onError: (error) => {
      toast.error('Failed to Update Asset', {
        description: error.message,
      });
    },
  });

  const onSubmit = (values: AssetFormValues) => {
    const assetData: TablesInsert<'assets'> = {
      name: values.name,
      asset_code: values.asset_code,
      category: values.category,
      status: values.status,
      assigned_to: values.assigned_to,
      serial_number: values.serial_number,
      location: values.location,
      last_service_date: values.last_service_date ? format(values.last_service_date, 'yyyy-MM-dd') : null,
    };

    if (asset) {
      updateAssetMutation.mutate(assetData);
    } else {
      createAssetMutation.mutate(assetData);
    }
  };

  const assetCategories = Object.values(AssetCategoryEnum);
  const assetStatuses = Object.values(AssetStatusEnum);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{asset ? 'Edit Asset' : 'Add New Asset'}</DialogTitle>
          <DialogDescription>
            {asset ? 'Update the details of the asset.' : 'Fill in the details to add a new asset.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              {...form.register('name')}
              className="col-span-3"
            />
            {form.formState.errors.name && (
              <p className="col-span-4 text-right text-sm text-red-500">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="asset_code" className="text-right">
              Asset Code
            </Label>
            <Input
              id="asset_code"
              {...form.register('asset_code')}
              className="col-span-3"
            />
            {form.formState.errors.asset_code && (
              <p className="col-span-4 text-right text-sm text-red-500">
                {form.formState.errors.asset_code.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">
              Category
            </Label>
            <Select
              onValueChange={(value: typeof AssetCategoryEnum[keyof typeof AssetCategoryEnum]) => form.setValue('category', value)}
              value={form.watch('category')}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {assetCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.category && (
              <p className="col-span-4 text-right text-sm text-red-500">
                {form.formState.errors.category.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select
              onValueChange={(value: typeof AssetStatusEnum[keyof typeof AssetStatusEnum]) => form.setValue('status', value)}
              value={form.watch('status')}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                {assetStatuses.map((stat) => (
                  <SelectItem key={stat} value={stat}>
                    {stat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.status && (
              <p className="col-span-4 text-right text-sm text-red-500">
                {form.formState.errors.status.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="assigned_to" className="text-right">
              Assigned To
            </Label>
            <Select
              onValueChange={(value) => form.setValue('assigned_to', value === 'null' ? null : value)}
              value={form.watch('assigned_to') || 'null'}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="null">Unassigned</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.assigned_to && (
              <p className="col-span-4 text-right text-sm text-red-500">
                {form.formState.errors.assigned_to.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="serial_number" className="text-right">
              Serial Number
            </Label>
            <Input
              id="serial_number"
              {...form.register('serial_number')}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="location" className="text-right">
              Location
            </Label>
            <Input
              id="location"
              {...form.register('location')}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="last_service_date" className="text-right">
              Last Service Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'col-span-3 justify-start text-left font-normal',
                    !form.watch('last_service_date') && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.watch('last_service_date') ? (
                    format(form.watch('last_service_date')!, 'PPP')
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={form.watch('last_service_date') || undefined}
                  onSelect={(date) => form.setValue('last_service_date', date || null)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={createAssetMutation.isPending || updateAssetMutation.isPending}
            >
              {asset ? 'Save Changes' : 'Add Asset'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
