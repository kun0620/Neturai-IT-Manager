import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type AssetLog =
  Database['public']['Tables']['asset_logs']['Row'];

export async function getAssetLogs(assetId: string) {
  const { data, error } = await supabase
    .from('asset_logs')
    .select('*')
    .eq('asset_id', assetId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as AssetLog[];
}
