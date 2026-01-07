import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface ITUser {
  id: string;
  name: string | null;
}

export function useITUsers() {
  return useQuery({
    queryKey: ['it-users'],
    queryFn: async (): Promise<ITUser[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, role')
        .in('role', ['it', 'admin']);

      if (error) throw error;
      return data ?? [];
    },
  });
}
