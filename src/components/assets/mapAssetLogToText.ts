// asset/mapAssetLogToText.ts
import { AssetLog } from '@/types/asset-log';

export function mapAssetLogToText(log: AssetLog) {
  const actor = log.performed_by ? 'User' : 'System';

  switch (log.action) {
    case 'create':
      return `${actor} created the asset`;
    case 'assign':
      return `${actor} assigned the asset to ${log.new_value ?? 'a user'}`;
    case 'unassign':
      return `${actor} unassigned the asset`;
    case 'status_change':
      return `${actor} changed status from "${log.old_value ?? '—'}" to "${
        log.new_value ?? '—'
      }"`;
    case 'update':
      return `${actor} updated ${log.field}: "${log.old_value ?? '—'}" → "${
        log.new_value ?? '—'
      }"`;
    case 'custom_field_update':
      return `${actor} updated ${log.field}`;

    default:
      return `${actor} updated the asset`;
  }
}
