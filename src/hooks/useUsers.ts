import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Tables } from '@/types/supabase';

type UserWithRole = Tables<'users'> & {
  roles: Tables<'roles'> | null;
};

async function fetchUsers(): Promise<UserWithRole[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*, roles(name)')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export function useUsers() {
  return useQuery<UserWithRole[], Error>({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });
}

// Export useUsers as useUsersForAssignment for consistency with AssetManagement.tsx
export function useUsersForAssignment() {
  return useUsers();
}
