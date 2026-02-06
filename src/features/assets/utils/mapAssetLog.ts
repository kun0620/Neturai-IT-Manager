import type { Database } from '@/types/supabase';
import { HistoryItem } from '../types/history';

type AssetLog = Database['public']['Tables']['asset_logs']['Row'];

export function mapAssetLog(
  log: AssetLog,
  resolveUserName?: (id?: string | null) => string | null
): HistoryItem {
  const actor =
    resolveUserName?.(log.performed_by) ??
    (log.performed_by ? 'User' : 'System');

  const base = {
    id: log.id,
    createdAt: log.created_at,
    actor,
  };

  switch (log.action) {
    case 'create':
      return {
        ...base,
        action: 'create',
        title: `${actor} created the asset`,
      };

    case 'status_change':
      return {
        ...base,
        action: 'status_change',
        title: `${actor} changed status`,
        description: `${log.old_value ?? '—'} → ${log.new_value ?? '—'}`,
      };

    case 'assign':
    case 'unassign':
      return {
        ...base,
        action: log.action,
        title: `${actor} changed assignment`,
        description: `${log.old_value ?? 'Unassigned'} → ${
          log.new_value ?? 'Unassigned'
        }`,
      };

    default:
      if (log.action === 'update' && log.field === 'assigned_to') {
        return {
          ...base,
          action: 'update',
          title: `${actor} changed assignment`,
          description: `${log.old_value ?? 'Unassigned'} → ${
            log.new_value ?? 'Unassigned'
          }`,
        };
      }
      if (log.action === 'update' && log.field === 'status') {
        return {
          ...base,
          action: 'update',
          title: `${actor} changed status`,
          description: `${log.old_value ?? '—'} → ${log.new_value ?? '—'}`,
        };
      }
      return {
        ...base,
        action: log.action,
        title:
          log.action === 'custom_field_update'
            ? `${actor} updated a custom field`
            : `${actor} updated the asset`,
        description:
          log.action === 'update'
            ? `${log.field}: "${log.old_value ?? '—'}" → "${
                log.new_value ?? '—'
              }"`
            : null,
      };
  }
}
