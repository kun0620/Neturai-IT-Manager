import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { logSystemAction } from '@/features/logs/utils/logSystemAction';
import type { Database } from '@/types/database.types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

const PROFILE_FIELDS: Array<keyof ProfileRow> = [
  'full_name',
  'department',
  'location',
  'assigned_asset_id',
  'device_type',
  'device_details',
  'preferred_contact',
];

const hasProfileChanges = (
  oldProfile: ProfileRow | null,
  updates: Partial<ProfileRow>
) =>
  !!PROFILE_FIELDS.find(
    (field) =>
      field in updates &&
      updates[field] !== undefined &&
      updates[field] !== oldProfile?.[field]
  );

export function useUserProfile() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();

  const query = useQuery<ProfileRow | null>({
    queryKey: ['user-profile', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId!)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });

  const mutation = useMutation<
    ProfileRow,
    Error,
    Partial<Pick<ProfileRow, (typeof PROFILE_FIELDS)[number]>>,
    { previous: ProfileRow | null }
  >({
    mutationFn: async (updates) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId!)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['user-profile', userId] });
      const previous = queryClient.getQueryData<ProfileRow | null>([
        'user-profile',
        userId,
      ]);
      queryClient.setQueryData(['user-profile', userId], (old) => ({
        ...(old ?? {}),
        ...updates,
      }));
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['user-profile', userId], context.previous);
      }
    },
    onSuccess: (_, updates) => {
      queryClient.invalidateQueries({ queryKey: ['user-profile', userId] });

      const previous = queryClient.getQueryData<ProfileRow | null>([
        'user-profile',
        userId,
      ]);
      if (hasProfileChanges(previous, updates)) {
        logSystemAction({
          action: 'profile.updated',
          details: { updates },
          userId,
        });
      }
    },
  });

  return { ...query, updateProfile: mutation };
}
