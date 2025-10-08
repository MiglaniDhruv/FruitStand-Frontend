/**
 * Utility for adding timeout functionality to fetch requests
 */

import { TimeoutError } from './api-errors';

export const DEFAULT_REQUEST_TIMEOUT = 30000; // 30 seconds
export const LONG_REQUEST_TIMEOUT = 60000; // 60 seconds for file uploads, reports, etc.

export async function fetchWithTimeout(
  url: string, 
  options: RequestInit = {}, 
  timeout: number = DEFAULT_REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  
  // Set up timeout
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);
  
  try {
    // Add abort signal to fetch options
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    // Clear timeout if request completes successfully
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Check if error is due to abort (timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TimeoutError(`Request timed out after ${timeout}ms`, error);
    }
    
    // Re-throw other errors
    throw error;
  }
}