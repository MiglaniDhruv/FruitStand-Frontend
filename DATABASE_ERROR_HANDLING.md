# Database Error Handling and Recovery System

This document describes the enhanced database error handling and recovery system implemented to prevent application crashes due to database connection issues, particularly with Neon database termination errors.

## Overview

The system consists of several layers of protection:

1. **Connection Pool Configuration** - Better connection management
2. **Error Detection and Classification** - Identify recoverable vs. non-recoverable errors
3. **Automatic Retry Logic** - Retry failed operations with exponential backoff
4. **Circuit Breaker Pattern** - Prevent cascading failures
5. **Health Monitoring** - Continuous monitoring and recovery attempts
6. **Graceful Error Responses** - User-friendly error messages

## Components

### 1. Enhanced Database Connection (`server/db.ts`)

- Configured connection pool with proper timeouts and limits
- Pool-level error handlers that don't crash the application
- Graceful shutdown function for clean database disconnection

### 2. Database Error Handler (`server/src/utils/database-errors.ts`)

Enhanced to handle Neon-specific errors:
- `{:shutdown, :db_termination}` - Database connection terminated
- WebSocket connection errors
- Serverless database unavailability

### 3. Database Health Monitoring (`server/src/utils/database-health.ts`)

- Periodic health checks (every 30 seconds)
- Automatic recovery attempts for connection issues
- Health status tracking and reporting

### 4. Retry Logic (`server/src/utils/database-retry.ts`)

- Exponential backoff retry strategy
- Configurable retry conditions and limits
- Circuit breaker pattern to prevent overwhelming failed services

### 5. Enhanced Database Client (`server/src/utils/enhanced-db.ts`)

- Wrapper around the original Drizzle instance
- Automatic retry and error handling for all database operations
- Transaction support with retry logic

### 6. Database Health Middleware (`server/src/middleware/database-health.ts`)

- Pre-request health checks for API routes
- Automatic recovery attempts before processing requests
- Service unavailable responses when database is down

## Usage

### For Existing Code

The existing `wrapDatabaseOperation` method in `BaseController` automatically benefits from the enhanced error handling. No changes needed to existing controllers.

```typescript
// This already includes enhanced error handling
const user = await this.wrapDatabaseOperation(() =>
  this.userModel.createUser(tenantId, userData)
);
```

### For New Code - Enhanced Database Client

For new code that needs maximum reliability:

```typescript
import { enhancedDb } from '../utils/enhanced-db';

// Simple query with automatic retry
const users = await enhancedDb.query(db => 
  db.select().from(usersTable).where(eq(usersTable.tenantId, tenantId))
);

// Transaction with automatic retry
const result = await enhancedDb.transaction(async (tx) => {
  const user = await tx.insert(usersTable).values(userData).returning();
  await tx.insert(auditTable).values({ action: 'user_created', userId: user[0].id });
  return user[0];
});
```

### For Direct Retry Logic

```typescript
import { withDatabaseRetry } from '../utils/database-retry';

// Wrap any database operation with retry logic
const result = await withDatabaseRetry(async () => {
  return await db.select().from(table);
}, {
  maxRetries: 5,
  initialDelayMs: 2000
});
```

## Error Types and Handling

### Recoverable Errors (Automatically Retried)
- Database connection termination (`{:shutdown, :db_termination}`)
- WebSocket connection errors
- Connection timeouts
- Network connectivity issues
- Temporary service unavailability

### Non-Recoverable Errors (Immediate Failure)
- Schema errors (missing tables, columns)
- Permission/authentication errors
- Data validation errors
- Constraint violations

## Monitoring

### Health Check Endpoint
- `GET /api/health` - Returns detailed system and database health information
- Includes connection pool stats, circuit breaker status, and memory usage

### Logs
The system logs various events:
- Database connection establishment/termination
- Health check failures and recoveries
- Retry attempts and outcomes
- Circuit breaker state changes

## Configuration

### Environment Variables
- `DATABASE_URL` - Database connection string (required)
- `NODE_ENV` - Affects error detail verbosity

### Health Monitoring
- Default health check interval: 30 seconds
- Can be modified in `server/index.ts`

### Retry Configuration
Default retry settings (configurable per operation):
- Max retries: 3
- Initial delay: 1 second
- Max delay: 10 seconds
- Backoff multiplier: 2x

### Circuit Breaker
- Failure threshold: 5 consecutive failures
- Recovery timeout: 60 seconds
- Monitoring window: 5 minutes

## Benefits

1. **Improved Reliability** - Application continues running despite temporary database issues
2. **Better User Experience** - Users see "please try again" instead of 500 errors
3. **Automatic Recovery** - System attempts to recover without manual intervention
4. **Detailed Monitoring** - Health endpoint provides insight into system status
5. **Graceful Degradation** - Circuit breaker prevents overwhelming failed services

## Best Practices

1. **Use Enhanced Database Client** for new critical operations
2. **Monitor Health Endpoint** in production for early warning signs
3. **Configure Alerts** on repeated health check failures
4. **Test Recovery** by simulating database disconnections
5. **Review Logs** regularly for patterns in database issues

## Testing

To test the error handling system:

1. **Simulate Connection Issues**: Temporarily modify `DATABASE_URL` to an invalid value
2. **Check Health Endpoint**: Verify `/api/health` reports issues correctly
3. **Test Recovery**: Restore valid `DATABASE_URL` and verify automatic recovery
4. **Load Testing**: Ensure system handles high load with occasional failures

This system significantly improves the application's resilience to database connectivity issues while maintaining existing API compatibility.