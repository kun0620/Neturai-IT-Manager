import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

/** 🔹 Type จาก DB จริง */
export type Profile =
  Database['public']['Tables']['profiles']['Row'];

/** 🔹 Type สำหรับใช้ใน UI (เช่น Assigned To) */
export type UserProfile = Pick<Profile, 'id' | 'email' | 'name'>;

/** 🔹 query ดึง user สำหรับ dropdown / assignment */
async function getUsersForAssignment(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name')
    .order('name');

  if (error) throw error;
  return data ?? [];
}

/** 🔹 Hook ที่หน้า Asset / Ticket ใช้ */
export function useUsersForAssignment() {
  return useQuery<UserProfile[], Error>({
    queryKey: ['users-for-assignment'],
    queryFn: getUsersForAssignment,
  });
}
