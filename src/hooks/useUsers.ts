import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Tables } from '@/types/database.types'; // Corrected import path

// Define the type for a user with their role
export type UserWithRole = Tables<'users'> & {
  roles: Pick<Tables<'roles'>, 'name'> | null; // Only pick 'name' from roles
};

async function getUsers(): Promise<UserWithRole[]> {
  // Select all user fields and the name from the related roles table
  // This is the idiomatic way to fetch related data in Supabase client,
  // effectively performing a join without explicit SQL JOIN syntax.
  const { data, error } = await supabase.from('users').select('*, roles(name)');
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export function useUsers() {
  return useQuery<UserWithRole[], Error>({
    queryKey: ['users'],
    queryFn: getUsers,
  });
}

// Export useUsers as useUsersForAssignment for consistency with AssetManagement.tsx
export function useUsersForAssignment() {
  return useUsers();
}
