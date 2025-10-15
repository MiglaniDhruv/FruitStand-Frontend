import { useMutation, useQueryClient, type QueryKey, type UseMutationOptions } from "@tanstack/react-query";

export interface OptimisticMutationOptions<TData, TVariables, TContext = { previousData?: unknown }>
  extends Omit<UseMutationOptions<TData, Error, TVariables, TContext>, "onMutate"> {
  queryKey: QueryKey;
  mutationFn: (variables: TVariables) => Promise<TData>;
  updateFn: (oldData: any, variables: TVariables) => any;
  rollbackOnError?: boolean;
}

export function useOptimisticMutation<TData, TVariables, TContext = { previousData?: unknown }>(
  opts: OptimisticMutationOptions<TData, TVariables, TContext>
) {
  const { queryKey, mutationFn, updateFn, rollbackOnError = true, onError, onSettled, ...rest } = opts;
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables, TContext>({
    mutationFn,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: any) => updateFn(old, variables));
      return { previousData } as TContext;
    },
    onError: (error, variables, context) => {
      if (rollbackOnError && context && typeof context === 'object' && 'previousData' in (context as any)) {
        queryClient.setQueryData(queryKey, (context as any).previousData);
      }
      onError?.(error, variables, context);
    },
    onSettled: (data, error, variables, context) => {
      queryClient.invalidateQueries({ queryKey });
      onSettled?.(data, error, variables, context);
    },
    onSuccess: rest.onSuccess,
  });
}

// Minimal array helpers for paginated/common arrays
export function optimisticCreate<T>(oldData: { data: T[]; pagination?: any }|undefined, item: T) {
  if (!oldData) return { data: [item] } as any;
  return { ...oldData, data: [item, ...oldData.data] };
}

export function optimisticUpdate<T extends { id: string|number }>(oldData: { data: T[]; pagination?: any }|undefined, updated: Partial<T> & { id: string|number }) {
  if (!oldData) return { data: [] } as any;
  return { ...oldData, data: oldData.data.map(i => i.id === updated.id ? { ...i, ...updated } : i) };
}

export function optimisticDelete<T extends { id: string|number }>(oldData: { data: T[]; pagination?: any }|T[]|undefined, id: string|number) {
  if (!oldData) return { data: [] } as any;
  
  // Handle direct array (like categories)
  if (Array.isArray(oldData)) {
    return oldData.filter(i => i.id !== id);
  }
  
  // Handle paginated object
  const next = oldData.data.filter(i => i.id !== id);
  return { ...oldData, data: next, pagination: oldData.pagination ? { ...oldData.pagination, total: Math.max(0, oldData.pagination.total - 1) } : undefined };
}
