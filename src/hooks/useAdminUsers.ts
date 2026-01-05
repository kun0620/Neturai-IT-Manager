import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
type UserRole = 'admin' | 'it' | 'user';

/* ---------- FETCH USERS ---------- */
async function getAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, created_at')
    .order('name');

  if (error) throw error;
  return data ?? [];
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: getAllProfiles,
  });
}

/* ---------- UPDATE ROLE ---------- */
async function updateUserRole(payload: {
  userId: string;
  role: UserRole;
}) {
  const { error } = await supabase
    .from('profiles')
    .update({ role: payload.role })
    .eq('id', payload.userId);

  if (error) throw error;
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUserRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}
