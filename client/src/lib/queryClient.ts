import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { authenticatedApiRequest } from './auth';
import { logApiError } from './error-logger';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

const queryFunction: QueryFunction = async ({ queryKey }) => {
  const url = queryKey.join('/') as string;
  try {
    const response = await authenticatedApiRequest('GET', url);
    return await response.json();
  } catch (error) {
    logApiError(error, url, 'GET');
    throw error;
  }
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: queryFunction,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
