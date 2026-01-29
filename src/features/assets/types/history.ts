export type HistoryAction =
  | 'create'
  | 'update'
  | 'assign'
  | 'unassign'
  | 'status_change'
  | 'custom_field_update';

export type HistoryItem = {
  id: string;
  action: HistoryAction;
  title: string;
  description?: string;
  actor: string;
  createdAt: string;
};
