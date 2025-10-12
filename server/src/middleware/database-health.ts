/**
 * Middleware for handling database connection errors gracefully
 */

import { Request, Response, NextFunction } from 'express';
import { checkDatabaseHealth, attemptDatabaseRecovery } from '../utils/database-health';
import { ERROR_CODES } from '../constants/error-codes';

/**
 * Middleware that checks database health before processing requests
 * and attempts recovery if needed
 */
export async function databaseHealthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Skip health check for the health endpoint itself to avoid infinite loops
    if (req.path === '/api/health') {
      return next();
    }

    // Only check database health for API routes that likely need database access
    if (!req.path.startsWith('/api/')) {
      return next();
    }

    // Quick health check
    const health = await checkDatabaseHealth();
    
    if (health.isHealthy) {
      return next();
    }

    // Database is unhealthy, attempt recovery
    console.warn('Database unhealthy, attempting recovery before processing request');
    const recovered = await attemptDatabaseRecovery();
    
    if (recovered) {
      console.log('Database recovery successful, proceeding with request');
      return next();
    }

    // Recovery failed, return service unavailable
    console.error('Database recovery failed, returning service unavailable');
    res.status(503).json({
      success: false,
      error: {
        message: 'Database service temporarily unavailable. Please try again in a moment.',
        code: ERROR_CODES.SYSTEM_SERVICE_UNAVAILABLE,
        statusCode: 503,
      },
      requestId: (req as any).requestId,
    });
    return;

  } catch (error) {
    // Don't let health check errors break the request flow
    console.warn('Database health check failed, proceeding with request:', error);
    next();
  }
}

/**
 * Express error handler specifically for database connection errors
 */
export function databaseErrorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Check if this is a database connection error
  const message = error?.message || '';
  
  const isDatabaseConnectionError = (
    message.includes('{:shutdown, :db_termination}') ||
    message.includes('db_termination') ||
    message.includes('WebSocket connection') ||
    message.includes('connection refused') ||
    message.includes('ECONNRESET') ||
    message.includes('ETIMEDOUT') ||
    (error?.stack && error.stack.includes('@neondatabase/serverless'))
  );

  if (isDatabaseConnectionError) {
    console.warn('Database connection error caught by middleware:', message);

    // Return a user-friendly error response
    res.status(503).json({
      success: false,
      error: {
        message: 'Database connection issue. Please try again in a moment.',
        code: ERROR_CODES.SYSTEM_SERVICE_UNAVAILABLE,
        statusCode: 503,
      },
      requestId: (req as any).requestId,
    });
    return;
  }

  // Not a database connection error, pass to next error handler
  next(error);
}