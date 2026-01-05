export const USER_ROLES = ['admin', 'it', 'user'] as const;
export type UserRole = typeof USER_ROLES[number];
