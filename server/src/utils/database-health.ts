/**
 * Database health check and recovery utilities
 */

import { pool, db } from '../../db';
import { sql } from 'drizzle-orm';

interface DatabaseHealthStatus {
  isHealthy: boolean;
  connectionCount: number;
  lastChecked: Date;
  error?: string;
}

let lastHealthCheck: DatabaseHealthStatus = {
  isHealthy: true,
  connectionCount: 0,
  lastChecked: new Date(),
};

/**
 * Performs a health check on the database connection
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealthStatus> {
  try {
    // Simple query to test connection
    const result = await db.execute(sql`SELECT 1 as test`);
    
    const status: DatabaseHealthStatus = {
      isHealthy: true,
      connectionCount: pool.totalCount || 0,
      lastChecked: new Date(),
    };
    
    lastHealthCheck = status;
    return status;
  } catch (error) {
    const status: DatabaseHealthStatus = {
      isHealthy: false,
      connectionCount: pool.totalCount || 0,
      lastChecked: new Date(),
      error: error instanceof Error ? error.message : String(error),
    };
    
    lastHealthCheck = status;
    console.warn('Database health check failed:', error);
    return status;
  }
}

/**
 * Gets the last known health status without performing a new check
 */
export function getLastHealthStatus(): DatabaseHealthStatus {
  return { ...lastHealthCheck };
}

/**
 * Attempts to recover from database connection issues
 */
export async function attemptDatabaseRecovery(): Promise<boolean> {
  try {
    console.log('Attempting database connection recovery...');
    
    // Wait a bit before attempting recovery
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try to perform a simple health check
    const health = await checkDatabaseHealth();
    
    if (health.isHealthy) {
      console.log('Database connection recovery successful');
      return true;
    } else {
      console.warn('Database connection recovery failed:', health.error);
      return false;
    }
  } catch (error) {
    console.error('Database recovery attempt failed:', error);
    return false;
  }
}

/**
 * Monitors database health and logs warnings for connection issues
 */
export function startDatabaseHealthMonitoring(intervalMs: number = 30000): NodeJS.Timeout {
  console.log(`Starting database health monitoring (interval: ${intervalMs}ms)`);
  
  return setInterval(async () => {
    try {
      const health = await checkDatabaseHealth();
      
      if (!health.isHealthy) {
        console.warn(`Database health check failed: ${health.error}`);
        
        // Attempt recovery for connection issues
        if (health.error?.includes('connection') || health.error?.includes('termination')) {
          await attemptDatabaseRecovery();
        }
      }
    } catch (error) {
      console.error('Error during health monitoring:', error);
    }
  }, intervalMs);
}

/**
 * Creates a database health endpoint handler
 */
export async function getDatabaseHealthEndpoint(): Promise<{
  status: 'healthy' | 'unhealthy';
  details: DatabaseHealthStatus;
}> {
  const health = await checkDatabaseHealth();
  
  return {
    status: health.isHealthy ? 'healthy' : 'unhealthy',
    details: health,
  };
}