import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Tables } from '@/types/supabase';

export type UserProfile = Tables<'users'>;

async function getUsers(): Promise<UserProfile[]> {
  const { data, error } = await supabase.from('users').select('id, email, name');
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export function useUsers() {
  return useQuery<UserProfile[], Error>({
    queryKey: ['users'],
    queryFn: getUsers,
  });
}

// Export useUsers as useUsersForAssignment for consistency with AssetManagement.tsx
export function useUsersForAssignment() {
  return useUsers();
}
