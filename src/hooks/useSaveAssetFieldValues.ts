import { supabase } from '@/lib/supabase';

type SavePayload = {
  assetId: string;
  assetTypeId?: string;
  values: Record<string, string>;
  fields: {
    id: string;
    key: string;
  }[];
};

async function ensureSerialNumberField(assetTypeId: string) {
  const { data: existingField, error: selectError } = await supabase
    .from('asset_fields')
    .select('id, field_key')
    .eq('asset_type_id', assetTypeId)
    .eq('field_key', 'serial_number')
    .maybeSingle();

  if (selectError) throw selectError;
  if (existingField) {
    return { id: existingField.id, key: existingField.field_key };
  }

  const { data: createdField, error: insertError } = await supabase
    .from('asset_fields')
    .insert({
      asset_type_id: assetTypeId,
      field_key: 'serial_number',
      field_label: 'Serial Number',
      field_type: 'text',
      is_required: false,
    })
    .select('id, field_key')
    .single();

  if (insertError) throw insertError;

  return { id: createdField.id, key: createdField.field_key };
}



export async function saveAssetFieldValues({
  assetId,
  assetTypeId,
  values,
  fields,
}: SavePayload) {
  const nextFields = [...fields];
  const hasSerialKey = Object.prototype.hasOwnProperty.call(values, 'serial_number');

  if (
    hasSerialKey &&
    assetTypeId &&
    !nextFields.some((field) => field.key === 'serial_number')
  ) {
    const serialField = await ensureSerialNumberField(assetTypeId);
    nextFields.push(serialField);
  }

  const rows = nextFields
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
