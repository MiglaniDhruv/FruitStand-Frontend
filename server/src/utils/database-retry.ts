/**
 * Database operation retry wrapper with exponential backoff
 */

import { attemptDatabaseRecovery } from './database-health';

interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: any) => boolean;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryCondition: (error: any) => {
    const message = error?.message || '';
    return (
      // Retry on connection errors
      message.includes('connection') ||
      message.includes('termination') ||
      message.includes('timeout') ||
      message.includes('{:shutdown, :db_termination}') ||
      message.includes('WebSocket') ||
      // Retry on temporary Neon errors
      message.includes('serverless') ||
      message.includes('ECONNRESET') ||
      message.includes('ETIMEDOUT')
    );
  },
};

/**
 * Executes a database operation with automatic retry logic
 */
export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // If this is a retry attempt, try to recover the connection first
      if (attempt > 0) {
        console.log(`Database operation retry attempt ${attempt}/${config.maxRetries}`);
        await attemptDatabaseRecovery();
      }
      
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry if this is the last attempt
      if (attempt === config.maxRetries) {
        break;
      }
      
      // Don't retry if the error doesn't meet retry conditions
      if (!config.retryCondition(error)) {
        console.log('Error does not meet retry conditions, failing immediately');
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelayMs
      );
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Database operation failed (attempt ${attempt + 1}/${config.maxRetries + 1}), retrying in ${delay}ms:`, errorMessage);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // All retries exhausted, throw the last error
  throw lastError;
}

/**
 * Wraps a database query function to automatically retry on connection errors
 */
export function withRetry<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options?: RetryOptions
) {
  return async (...args: TArgs): Promise<TReturn> => {
    return withDatabaseRetry(() => fn(...args), options);
  };
}

/**
 * Creates a circuit breaker for database operations
 */
export class DatabaseCircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private isOpen = false;
  
  constructor(
    private readonly failureThreshold = 5,
    private readonly recoveryTimeoutMs = 60000, // 1 minute
    private readonly monitoringWindowMs = 300000 // 5 minutes
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit breaker should reset
    if (this.isOpen && Date.now() - this.lastFailureTime > this.recoveryTimeoutMs) {
      console.log('Circuit breaker recovery timeout reached, attempting to close');
      this.reset();
    }
    
    // If circuit is open, fail fast
    if (this.isOpen) {
      throw new Error('Database circuit breaker is open - too many recent failures');
    }
    
    try {
      const result = await operation();
      
      // Success - reset failure count if we're within monitoring window
      if (Date.now() - this.lastFailureTime < this.monitoringWindowMs) {
        this.failureCount = Math.max(0, this.failureCount - 1);
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
  
  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      console.warn(`Database circuit breaker opened after ${this.failureCount} failures`);
      this.isOpen = true;
    }
  }
  
  private reset(): void {
    this.failureCount = 0;
    this.isOpen = false;
    console.log('Database circuit breaker reset');
  }
  
  getStatus() {
    return {
      isOpen: this.isOpen,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// Global circuit breaker instance
export const databaseCircuitBreaker = new DatabaseCircuitBreaker();