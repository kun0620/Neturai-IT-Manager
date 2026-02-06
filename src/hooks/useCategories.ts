import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Tables } from '@/types/supabase';

type TicketCategory = Tables<'ticket_categories'>;

async function fetchCategories(): Promise<TicketCategory[]> {
  const { data, error } = await supabase
    .from('ticket_categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

async function addCategoryMutation(category: { name: string }): Promise<TicketCategory> {
  const { data, error } = await supabase
    .from('ticket_categories')
    .insert(category)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

async function updateCategoryMutation(category: Partial<TicketCategory> & { id: string }): Promise<TicketCategory> {
  const { id, name } = category;
  const { data, error } = await supabase
    .from('ticket_categories')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

async function deleteCategoryMutation(id: string): Promise<void> {
  const { error } = await supabase
    .from('ticket_categories')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
}

export function useCategories() {
  return useQuery<TicketCategory[], Error>({
    queryKey: ['ticket_categories'],
    queryFn: fetchCategories,
  });
}

type CategoryStat = {
  category: string;
  count: number;
};

async function fetchCategoryStats(): Promise<CategoryStat[]> {
  const { data, error } = await supabase.rpc('get_issue_categories_distribution');

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export function useCategoryStats() {
  return useQuery<CategoryStat[], Error>({
    queryKey: ['ticket_categories', 'stats'],
    queryFn: fetchCategoryStats,
  });
}

export function useAddCategory() {
  const queryClient = useQueryClient();
  return useMutation<TicketCategory, Error, { name: string }>({
    mutationFn: addCategoryMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket_categories'] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation<TicketCategory, Error, Partial<TicketCategory> & { id: string }>({
    mutationFn: updateCategoryMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket_categories'] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteCategoryMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket_categories'] });
    },
  });
}
