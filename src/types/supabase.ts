import { Database } from './database.types';

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];

export type Ticket = Tables<'tickets'>;
export type TicketComment = Tables<'ticket_comments'>;
export type TicketHistory = Tables<'ticket_history'>;
export type Asset = Tables<'assets'>;
export type Repair = Tables<'repairs'>;
export type User = Tables<'users'>;
export type Role = Tables<'roles'>;
export type Setting = Tables<'settings'>;
export type TicketCategory = Tables<'ticket_categories'>;
export type SLAPolicy = Tables<'sla_policies'>;
export type Log = Tables<'logs'>;
