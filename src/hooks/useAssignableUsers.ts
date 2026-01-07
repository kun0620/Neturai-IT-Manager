import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface AssignableUser {
  id: string;
  name: string | null;
}

export function useAssignableUsers() {
  return useQuery<AssignableUser[]>({
    queryKey: ['assignable-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .in('role', ['admin', 'it']); // ✅ คนที่ assign ได้

      if (error) throw error;
      return data ?? [];
    },
  });
}
