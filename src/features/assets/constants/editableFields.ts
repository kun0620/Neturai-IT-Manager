export const EDITABLE_ASSET_FIELDS = [
  'name',
  'asset_code',
  'serial_number',
  'location',
  'category_id',
  'asset_type_id',
  'description',
] as const;

export type EditableAssetField = typeof EDITABLE_ASSET_FIELDS[number];
