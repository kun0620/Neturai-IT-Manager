import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/constants/roles';

interface UpdateRolePayload {
  userId: string;
  role: UserRole;
}

export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, UpdateRolePayload>({
    mutationFn: async ({ userId, role }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
};
