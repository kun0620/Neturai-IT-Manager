import { supabase } from '@/lib/supabase';

type LogInput = {
  assetId: string;
  action:
    | 'create'
    | 'update'
    | 'assign'
    | 'unassign'
    | 'status_change'
    | 'custom_field_update';
  field: string;
  oldValue: string | null;
  newValue: string | null;
  performedBy?: string | null;
  metadata?: Record<string, unknown>;
};

export async function insertAssetLogs(logs: LogInput[]) {
  if (!logs.length) return;

  const { error } = await supabase.from('asset_logs').insert(
    logs.map((l) => ({
      asset_id: l.assetId,
      action: l.action,
      field: l.field,
      old_value: l.oldValue,
      new_value: l.newValue,
      performed_by: l.performedBy ?? null,
      metadata: l.metadata ?? null,
    }))
  );

  if (error) {
    void error;
  }
}
