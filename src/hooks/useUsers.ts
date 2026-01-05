import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];

async function getProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, created_at')
    .order('name');

  if (error) throw error;
  return data ?? [];
}

export function useUsers() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: getProfiles,
  });
}


/** ✅ เพิ่ม export นี้ */
export const useUsersForAssignment = useUsers;
