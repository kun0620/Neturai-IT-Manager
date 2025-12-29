import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];

async function getProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
  .from('profiles')
  .select('id, name, email, role, created_at')
  .in('role', ['admin', 'it'])
  .order('name');

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export function useUsers() {
  return useQuery<Profile[], Error>({
    queryKey: ['profiles'],
    queryFn: getProfiles,
  });
}

// ใช้สำหรับ assignment โดยตรง
export function useUsersForAssignment() {
  return useUsers();
}
