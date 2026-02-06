import { insertAssetLogs } from '@/services/assetLogs';

export type LogAssetChangeParams = {
  assetId: string;
  action: string;
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  userId?: string | null;
};

const stringify = (v: unknown) =>
  v === undefined || v === null ? null : String(v);

/**
 * Write a single asset history record (asset_logs).
 * Best-effort: do not throw if logging fails.
 */
export async function logAssetChange({
  assetId,
  action,
  oldValue = null,
  newValue = null,
  userId = null,
}: LogAssetChangeParams) {
  try {
    if (action === 'created') {
      await insertAssetLogs([
        {
          assetId,
          action: 'create',
          field: '*',
          oldValue: null,
          newValue: 'created',
          performedBy: userId,
        },
      ]);
      return;
    }

    if (action === 'status_changed') {
      await insertAssetLogs([
        {
          assetId,
          action: 'status_change',
          field: 'status',
          oldValue: stringify(oldValue?.status),
          newValue: stringify(newValue?.status),
          performedBy: userId,
        },
      ]);
      return;
    }

    if (action === 'assigned_changed') {
      const newAssigned = stringify(newValue?.assigned_to);
      await insertAssetLogs([
        {
          assetId,
          action: newAssigned ? 'assign' : 'unassign',
          field: 'assigned_to',
          oldValue: stringify(oldValue?.assigned_to),
          newValue: newAssigned,
          performedBy: userId,
        },
      ]);
      return;
    }

    await insertAssetLogs([
      {
        assetId,
        action: action === 'custom_field_update' ? 'custom_field_update' : 'update',
        field: 'custom',
        oldValue: stringify(oldValue),
        newValue: stringify(newValue),
        performedBy: userId,
      },
    ]);
  } catch (error) {
  }
}
