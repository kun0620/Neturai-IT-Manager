import type { Database } from '@/types/supabase';

type AssetLog =
  Database['public']['Tables']['asset_logs']['Row'];

export function logMessage(log: AssetLog) {
  switch (log.action) {
    case 'create':
      return 'Asset created';
    case 'assign':
      return `Assigned to user`;
    case 'unassign':
      return `Unassigned from user`;
    case 'status_change':
      return `Status changed from "${log.old_value}" to "${log.new_value}"`;
    case 'update':
      return `Updated ${log.field}: "${log.old_value}" → "${log.new_value}"`;
    case 'custom_field_update':
      return `Updated ${log.field}`;
    default:
      return 'Updated asset';
  }
}
