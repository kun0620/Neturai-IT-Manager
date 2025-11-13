import { useQuery } from '@tanstack/react-query';
    import { supabase } from '@/lib/supabase';
    import { Tables } from '@/types/supabase';

    async function getRoles(): Promise<Tables<'roles'>[]> {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }
      return data;
    }

    export function useRoles() {
      return useQuery<Tables<'roles'>[], Error>({
        queryKey: ['roles'],
        queryFn: getRoles,
      });
    }
