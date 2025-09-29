export interface PaginationOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Build URLSearchParams for paginated API requests
 * @param options - Pagination options including page, limit, search, and sorting
 * @returns URLSearchParams with paginated=true and all provided options
 */
export function buildPaginationParams(options: PaginationOptions): URLSearchParams {
  const params = new URLSearchParams();
  
  if (options.page) params.append('page', options.page.toString());
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.search) params.append('search', options.search);
  if (options.sortBy) params.append('sortBy', options.sortBy);
  if (options.sortOrder) params.append('sortOrder', options.sortOrder);
  params.append('paginated', 'true');
  
  return params;
}