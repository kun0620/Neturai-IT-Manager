import { supabase } from '@/lib/supabase';

type SavePayload = {
  assetId: string;
  values: Record<string, string>;
  fields: {
    id: string;
    key: string;
  }[];
};



export async function saveAssetFieldValues({
  assetId,
  values,
  fields,
}: SavePayload) {
  const rows = fields
    .filter((f) => values[f.key] !== undefined)
    .map((f) => ({
        asset_id: assetId,
        field_id: f.id,                 // ✅ ชื่อคอลัมน์ถูก
        value_text: values[f.key],      // ✅ ชื่อคอลัมน์ถูก
    }));

  if (rows.length === 0) return;

  const { error } = await supabase
    .from('asset_field_values')
    .upsert(rows, {
        onConflict: 'asset_id,field_id',   // ✅ ต้องตรงชื่อ column จริง
    });

  if (error) throw error;
  
}
