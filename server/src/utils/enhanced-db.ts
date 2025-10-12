/**
 * Enhanced database client with automatic error handling and retry logic
 */

import { db as originalDb, pool } from '../../db';
import { withDatabaseRetry, databaseCircuitBreaker } from './database-retry';
import { checkDatabaseHealth } from './database-health';
import { handleDatabaseError } from './database-errors';

/**
 * Enhanced database client that wraps the original Drizzle instance
 * with automatic retry logic and error handling
 */
export class EnhancedDatabase {
  constructor(private readonly db: typeof originalDb) {}

  /**
   * Execute a database operation with automatic retry and error handling
   */
  async execute<T>(operation: (db: typeof originalDb) => Promise<T>): Promise<T> {
    try {
      return await databaseCircuitBreaker.execute(async () => {
        return await withDatabaseRetry(() => operation(this.db));
      });
    } catch (error) {
      // Transform database errors into application errors
      handleDatabaseError(error);
    }
  }

  /**
   * Execute a query with automatic retry
   */
  async query<T>(operation: (db: typeof originalDb) => Promise<T>): Promise<T> {
    return this.execute(operation);
  }

  /**
   * Execute a transaction with automatic retry
   */
  async transaction<T>(
    operation: Parameters<typeof originalDb.transaction>[0]
  ): Promise<T> {
    return this.execute(async (db) => {
      return db.transaction(operation) as Promise<T>;
    });
  }

  /**
   * Get the underlying database instance (use sparingly)
   */
  getUnderlying(): typeof originalDb {
    return this.db;
  }

  /**
   * Get database health status
   */
  async getHealth() {
    return checkDatabaseHealth();
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus() {
    return databaseCircuitBreaker.getStatus();
  }

  /**
   * Get connection pool stats
   */
  getPoolStats() {
    return {
      totalCount: pool.totalCount || 0,
      idleCount: pool.idleCount || 0,
      waitingCount: pool.waitingCount || 0,
    };
  }
}

// Export enhanced database instance
export const enhancedDb = new EnhancedDatabase(originalDb);

// Export original db for backwards compatibility and direct access when needed
export { originalDb as db };