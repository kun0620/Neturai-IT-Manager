import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database.types';

/** Row type ของ profiles */
export type Profile = Database['public']['Tables']['profiles']['Row'];

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
