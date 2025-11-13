import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Tables } from '@/types/supabase';

type SLAPolicy = Tables<'sla_policies'>;

async function fetchSLAPolicies(): Promise<SLAPolicy[]> {
  const { data, error } = await supabase
    .from('sla_policies')
    .select('*')
    .order('priority', { ascending: true }); // Order by priority for consistent display

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

async function updateSLAPolicyMutation(policy: Partial<SLAPolicy> & { id: string }): Promise<SLAPolicy> {
  const { id, response_time_hours, resolution_time_hours } = policy;
  const { data, error } = await supabase
    .from('sla_policies')
    .update({ response_time_hours, resolution_time_hours, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export function useSLAPolicies() {
  return useQuery<SLAPolicy[], Error>({
    queryKey: ['sla_policies'],
    queryFn: fetchSLAPolicies,
  });
}

export function useUpdateSLAPolicy() {
  const queryClient = useQueryClient();
  return useMutation<SLAPolicy, Error, Partial<SLAPolicy> & { id: string }>({
    mutationFn: updateSLAPolicyMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla_policies'] });
    },
  });
}
