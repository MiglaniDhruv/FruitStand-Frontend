import { useMutation, useQueryClient, type QueryKey, type UseMutationOptions, type Query } from "@tanstack/react-query";

export interface OptimisticMutationOptions<TData, TVariables, TContext = { previousData?: unknown; previousVariants?: Map<string, unknown> }>
  extends Omit<UseMutationOptions<TData, Error, TVariables, TContext>, "onMutate"> {
  queryKey: QueryKey;
  mutationFn: (variables: TVariables) => Promise<TData>;
  updateFn: (oldData: any, variables: TVariables) => any;
  rollbackOnError?: boolean;
  /**
   * If true, updates all query variants matching the base queryKey (e.g., all pagination/filter combinations)
   * Uses setQueriesData with exact: false
   */
  updateAllVariants?: boolean;
}

export function useOptimisticMutation<TData, TVariables, TContext = { previousData?: unknown; previousVariants?: Map<string, unknown> }>(
  opts: OptimisticMutationOptions<TData, TVariables, TContext>
) {
  const { queryKey, mutationFn, updateFn, rollbackOnError = true, updateAllVariants = false, onError, onSettled, ...rest } = opts;
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables, TContext>({
    mutationFn,
    onMutate: async (variables) => {
      // Cancel all queries matching the queryKey pattern
      await queryClient.cancelQueries({ queryKey, exact: !updateAllVariants });
      
      if (updateAllVariants) {
        // Store previous data for all variants and update them
        const previousVariants = new Map<string, unknown>();
        
        queryClient.setQueriesData(
          { queryKey, exact: false },
          (old: any, query: Query) => {
            // Guard against undefined query
            if (!query) return old;
            
            // Store each variant's previous data using its query key
            previousVariants.set(JSON.stringify(query.queryKey), old);
            return updateFn(old, variables);
          }
        );
        
        return { previousVariants } as TContext;
      } else {
        // Original behavior: update only the exact queryKey
        const previousData = queryClient.getQueryData(queryKey);
        queryClient.setQueryData(queryKey, (old: any) => updateFn(old, variables));
        return { previousData } as TContext;
      }
    },
    onError: (error, variables, context) => {
      if (rollbackOnError && context && typeof context === 'object') {
        if (updateAllVariants && 'previousVariants' in (context as any)) {
          // Rollback all variants
          const previousVariants = (context as any).previousVariants as Map<string, unknown>;
          queryClient.setQueriesData(
            { queryKey, exact: false },
            (old: any, query: Query) => {
              // Guard against undefined query
              if (!query) return old;
              
              const cacheKey = JSON.stringify(query.queryKey);
              return previousVariants.get(cacheKey) ?? old;
            }
          );
        } else if ('previousData' in (context as any)) {
          // Rollback single query
          queryClient.setQueryData(queryKey, (context as any).previousData);
        }
      }
      onError?.(error, variables, context);
    },
    onSettled: (data, error, variables, context) => {
      // Invalidate all matching queries to refetch from server
      queryClient.invalidateQueries({ queryKey, exact: !updateAllVariants });
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
