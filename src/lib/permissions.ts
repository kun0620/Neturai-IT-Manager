export type UserRole = 'admin' | 'it' | 'user';

export type Permission =
  | 'asset.view'
  | 'asset.edit'
  | 'asset.delete'
  | 'asset.assign'
  | 'asset.status.change'
  | 'asset.history.view'
  | 'user.role.change'
  | 'ticket.view'
  | 'ticket.manage'
  | 'user.view'
  | 'user.role.update'
  | 'user.delete';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'asset.view',
    'asset.edit',
    'asset.delete',
    'asset.assign',
    'asset.status.change',
    'asset.history.view',
    'user.role.change',
    'ticket.view',
    'ticket.manage',
    'user.view',
    'user.role.update',
    'user.delete',
  ],
  it: [
    'asset.view',
    'asset.edit',
    'asset.delete',
    'asset.assign',
    'asset.status.change',
    'asset.history.view',
    'ticket.view',
    'ticket.manage',
    'user.view',
  ],
  user: [
    'asset.view',
    'asset.history.view',
    'ticket.view',
  ],
};

export function hasPermission(
  role: UserRole | null | undefined,
  permission: Permission
) {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}
