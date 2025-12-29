import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

/**
 * ใช้เฉพาะหน้า Admin เท่านั้น
 * - ดึง users ทุกคน
 * - ใช้ profiles อย่างเดียว
 * - ไม่ join
 */
export const useAdminUsers = () => {
  return useQuery<Profile[], Error>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, name, role, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data ?? [];
    },
  });
};
