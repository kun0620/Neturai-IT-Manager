import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database.types';

type AssetFieldRow =
  Database['public']['Tables']['asset_fields']['Row'];

export type AssetField = {
  id: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  options: any;
};

async function getAssetFields(assetTypeId: string) {
  const { data, error } = await supabase
    .from('asset_fields')
    .select('*')
    .eq('asset_type_id', assetTypeId)
    .order('created_at');

  if (error) throw error;

  return (data ?? []).map((row: AssetFieldRow): AssetField => ({
    id: row.id,
    key: row.field_key,
    label: row.field_label,
    type: row.field_type,
    required: row.is_required ?? false,
    options: row.options,
  }));
}

export function useAssetFields(assetTypeId?: string) {
  return useQuery({
    queryKey: ['asset-fields', assetTypeId],
    queryFn: () => getAssetFields(assetTypeId!),
    enabled: !!assetTypeId,
  });
}
