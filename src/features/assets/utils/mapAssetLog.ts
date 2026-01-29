import { HistoryItem, HistoryAction } from '../types/history';

export function mapAssetLog(
  log: any,
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

  switch (log.action as HistoryAction) {
    case 'create':
      return {
        ...base,
        action: 'create',
        title: 'Asset created',
      };

    case 'status_change':
      return {
        ...base,
        action: 'status_change',
        title: 'Status changed',
        description: `${log.old_value ?? '—'} → ${log.new_value ?? '—'}`,
      };

    case 'assign':
      return {
        ...base,
        action: 'assign',
        title: 'Assigned asset',
        description: `Assigned to ${
          resolveUserName?.(log.new_value) ?? 'User'
        }`,
      };

    case 'unassign':
      return {
        ...base,
        action: 'unassign',
        title: 'Unassigned asset',
      };

    case 'custom_field_update':
      return {
        ...base,
        action: 'custom_field_update',
        title: 'Custom field updated',
        description: `${log.field}: ${log.old_value ?? '—'} → ${log.new_value ?? '—'}`,
      };

    default:
      return {
        ...base,
        action: 'update',
        title: 'Asset updated',
      };
  }
}
