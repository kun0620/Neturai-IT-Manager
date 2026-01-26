import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

async function getAssetFieldValues(assetId: string) {
  const { data, error } = await supabase
    .from('asset_field_values')
    .select(`
      value_text,
      asset_fields!inner (
        field_key
      )
    `)
    .eq('asset_id', assetId);

  if (error) throw error;

  const result: Record<string, string> = {};

  (data ?? []).forEach((row: any) => {
    result[row.asset_fields.field_key] = row.value_text ?? '';
  });

  return result;
}

export function useAssetFieldValues(assetId?: string) {
  return useQuery({
    queryKey: ['asset-field-values', assetId],
    queryFn: () => getAssetFieldValues(assetId!),
    enabled: !!assetId,
  });
}
