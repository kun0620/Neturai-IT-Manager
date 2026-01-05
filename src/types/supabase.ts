import { createClient } from '@supabase/supabase-js';
import type { Database, Tables, Enums } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey
);

// ✅ export type จาก database.types ตรง ๆ
export type { Tables, Enums };

// ✅ optional aliases (ใช้สะดวก)
export type Ticket = Tables<'tickets'>;
export type TicketComment = Tables<'ticket_comments'>;
export type TicketHistory = Tables<'ticket_history'>;
export type Asset = Tables<'assets'>;
export type Repair = Tables<'repairs'>;
export type User = Tables<'users'>;
export type Profile = Tables<'profiles'>;
