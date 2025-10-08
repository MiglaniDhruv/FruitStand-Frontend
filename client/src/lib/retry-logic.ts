/**
 * Utility for retry logic with exponential backoff
 */

import { isRetryableError } from './api-errors';

export const MAX_RETRIES = 3;
export const INITIAL_RETRY_DELAY = 1000; // 1 second
export const MAX_RETRY_DELAY = 10000; // 10 seconds
export const RETRY_DELAY_MULTIPLIER = 2;

export function calculateRetryDelay(attemptNumber: number): number {
  // Calculate delay using exponential backoff
  const delay = INITIAL_RETRY_DELAY * Math.pow(RETRY_DELAY_MULTIPLIER, attemptNumber);
  
  // Cap at maximum delay
  const cappedDelay = Math.min(delay, MAX_RETRY_DELAY);
  
  // Add jitter (random variation ±20%) to prevent thundering herd
  const jitter = cappedDelay * (0.8 + Math.random() * 0.4);
  
  return Math.round(jitter);
}

export function sleep(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

export function shouldRetry(error: unknown, attemptNumber: number): boolean {
  // Check if we haven't exceeded max retries
  if (attemptNumber >= MAX_RETRIES) {
    return false;
  }
  
  // Check if error is retryable
  return isRetryableError(error);
}

export async function withRetry<T>(fn: () => Promise<T>, opts?: { maxRetries?: number; onRetry?: (error: unknown, attempt: number) => void; onGiveUp?: (error: unknown) => void; }) {
  const maxRetries = opts?.maxRetries ?? MAX_RETRIES;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try { return await fn(); } catch (error) {
      if (attempt >= maxRetries || !isRetryableError(error)) {
        opts?.onGiveUp?.(error);
        throw error;
      }
      opts?.onRetry?.(error, attempt);
      
      // Check for retryAfterMs on the error (e.g., from 429 responses)
      let delayMs = calculateRetryDelay(attempt);
      if (error && typeof error === 'object' && 'retryAfterMs' in error) {
        const retryAfterMs = (error as any).retryAfterMs;
        if (typeof retryAfterMs === 'number' && retryAfterMs > 0 && !isNaN(retryAfterMs)) {
          // Use server-specified delay, but optionally cap it
          delayMs = Math.min(retryAfterMs, MAX_RETRY_DELAY * 10); // Allow up to 10x MAX_RETRY_DELAY for server-specified delays
        }
      }
      
      await sleep(delayMs);
    }
  }
  throw new Error('Unreachable');
}