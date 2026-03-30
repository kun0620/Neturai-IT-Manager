import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type AssetCategory = {
  created_at: string;
  description: string | null;
  id: string;
  name: string;
};

async function getAssetCategories(): Promise<AssetCategory[]> {
  const { data, error } = await supabase
    .from('asset_categories')
    .select('id, name, description, created_at')
    .order('name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export type AssetCategoryStat = {
  categoryId: string;
  count: number;
};

async function getAssetCategoryStats(): Promise<AssetCategoryStat[]> {
  const { data, error } = await supabase
    .from('assets')
    .select('category_id');

  if (error) throw error;

  const countByCategory = new Map<string, number>();

  for (const row of data ?? []) {
    const categoryId = row.category_id;
    if (!categoryId) continue;
    countByCategory.set(categoryId, (countByCategory.get(categoryId) ?? 0) + 1);
  }

  return Array.from(countByCategory.entries()).map(([categoryId, count]) => ({
    categoryId,
    count,
  }));
}

async function addAssetCategoryMutation(category: {
  name: string;
}): Promise<AssetCategory> {
  const { data, error } = await supabase
    .from('asset_categories')
    .insert(category)
    .select('id, name, description, created_at')
    .single();

  if (error) throw error;
  return data;
}

async function updateAssetCategoryMutation(category: {
  id: string;
  name: string;
}): Promise<AssetCategory> {
  const { data, error } = await supabase
    .from('asset_categories')
    .update({ name: category.name })
    .eq('id', category.id)
    .select('id, name, description, created_at')
    .single();

  if (error) throw error;
  return data;
}

async function deleteAssetCategoryMutation(id: string): Promise<void> {
  const { error } = await supabase
    .from('asset_categories')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export function useAssetCategories() {
  return useQuery<AssetCategory[], Error>({
    queryKey: ['asset-categories'],
    queryFn: getAssetCategories,
  });
}

export function useAssetCategoryStats() {
  return useQuery<AssetCategoryStat[], Error>({
    queryKey: ['asset-categories', 'stats'],
    queryFn: getAssetCategoryStats,
  });
}

export function useAddAssetCategory() {
  const queryClient = useQueryClient();

  return useMutation<AssetCategory, Error, { name: string }>({
    mutationFn: addAssetCategoryMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-categories'] });
    },
  });
}

export function useUpdateAssetCategory() {
  const queryClient = useQueryClient();

  return useMutation<AssetCategory, Error, { id: string; name: string }>({
    mutationFn: updateAssetCategoryMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-categories'] });
    },
  });
}

export function useDeleteAssetCategory() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteAssetCategoryMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-categories'] });
      queryClient.invalidateQueries({ queryKey: ['asset-categories', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}
