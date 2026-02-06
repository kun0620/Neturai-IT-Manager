// types/asset-log.ts
export type AssetLog = {
  id: string;
  asset_id: string;
  action:
    | 'create'
    | 'update'
    | 'assign'
    | 'unassign'
    | 'status_change'
    | 'custom_field_update';
  field: string;
  old_value: string | null;
  new_value: string | null;
  performed_by: string | null;
  created_at: string;
};
