import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Tables } from '@/types/supabase';

type Setting = Tables<'settings'>;

async function fetchSettings(): Promise<Setting[]> {
  const { data, error } = await supabase
    .from('settings')
    .select('*');

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

async function updateSettingMutation(setting: Partial<Setting>): Promise<Setting> {
  const { key, value } = setting;
  if (!key || value === undefined) {
    throw new Error('Setting key and value are required for update.');
  }

  const { data, error } = await supabase
    .from('settings')
    .upsert({ key, value, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export function useSettings() {
  return useQuery<Setting[], Error>({
    queryKey: ['settings'],
    queryFn: fetchSettings,
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();
  return useMutation<Setting, Error, Partial<Setting>>({
    mutationFn: updateSettingMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}
