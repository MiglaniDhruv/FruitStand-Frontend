# Error Handling Verification Checklist

## ✅ Implementation Verification

### Core Infrastructure
- [x] Process-level error handlers (uncaughtException, unhandledRejection)
- [x] Graceful shutdown handlers (SIGTERM, SIGINT)
- [x] Global error middleware in `server/index.ts`
- [x] asyncHandler utility in `server/src/utils/async-handler.ts`
- [x] Custom error classes in `server/src/types/index.ts`
- [x] Error codes in `server/src/constants/error-codes.ts`
- [x] Error logger in `server/src/utils/error-logger.ts`
- [x] Database error handler in `server/src/utils/database-errors.ts`

### Middleware
- [x] Request ID tracking (`attachRequestId`)
- [x] Request timeout (`requestTimeout`)
- [x] Input sanitization (`sanitizeInputs`)
- [x] Auth middleware throws custom errors
- [x] Tenant validation middleware throws custom errors

### All 18 Modules
- [x] auth - asyncHandler applied
- [x] bank-accounts - asyncHandler applied
- [x] crates - asyncHandler applied
- [x] dashboard - asyncHandler applied
- [x] expenses - asyncHandler applied
- [x] items - asyncHandler applied
- [x] ledgers - asyncHandler applied
- [x] payments - asyncHandler applied
- [x] purchase-invoices - asyncHandler applied
- [x] retailers - asyncHandler applied
- [x] sales-invoices - asyncHandler applied
- [x] sales-payments - asyncHandler applied
- [x] stock - asyncHandler applied
- [x] tenants - asyncHandler applied
- [x] users - asyncHandler applied
- [x] vendors - asyncHandler applied
- [x] whatsapp - asyncHandler applied
- [x] public - asyncHandler applied

## 🧪 Test Scenarios

### 1. Validation Errors (400)

**Test Case**: Create item with missing required fields
```bash
curl -X POST http://localhost:5000/api/items \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": ""}'
```

**Expected Response**:
```json
{
  "success": false,
  "error": {
    "message": "Item name is required",
    "code": "VALIDATION_FAILED",
    "statusCode": 400,
    "details": {
      "fields": {
        "name": "Name cannot be empty"
      }
    }
  },
  "requestId": "..."
}
```

**Verification**:
- [ ] Status code is 400
- [ ] Error message is user-friendly
- [ ] Field-level validation details included
- [ ] requestId is present
- [ ] Server does not crash

### 2. Authentication Errors (401)

**Test Case**: Access protected route without token
```bash
curl -X GET http://localhost:5000/api/items
```

**Expected Response**:
```json
{
  "success": false,
  "error": {
    "message": "Access token required",
    "code": "AUTH_UNAUTHORIZED",
    "statusCode": 401
  },
  "requestId": "..."
}
```

**Verification**:
- [ ] Status code is 401
- [ ] Error message indicates missing token
- [ ] Server does not crash

**Test Case**: Access with invalid/expired token
```bash
curl -X GET http://localhost:5000/api/items \
  -H "Authorization: Bearer invalid_token"
```

**Expected Response**:
```json
{
  "success": false,
  "error": {
    "message": "Invalid token",
    "code": "AUTH_UNAUTHORIZED",
    "statusCode": 401
  },
  "requestId": "..."
}
```

**Verification**:
- [ ] Status code is 401
- [ ] Error message indicates invalid token
- [ ] Server does not crash

### 3. Authorization Errors (403)

**Test Case**: Access resource without sufficient permissions
```bash
curl -X DELETE http://localhost:5000/api/vendors/<id> \
  -H "Authorization: Bearer <accountant_token>"
```

**Expected Response**:
```json
{
  "success": false,
  "error": {
    "message": "Insufficient permissions",
    "code": "AUTH_INSUFFICIENT_PERMISSIONS",
    "statusCode": 403
  },
  "requestId": "..."
}
```

**Verification**:
- [ ] Status code is 403
- [ ] Error message indicates permission issue
- [ ] Server does not crash

### 4. Not Found Errors (404)

**Test Case**: Get non-existent resource
```bash
curl -X GET http://localhost:5000/api/vendors/00000000-0000-0000-0000-000000000000 \
  -H "Authorization: Bearer <token>"
```

**Expected Response**:
```json
{
  "success": false,
  "error": {
    "message": "Vendor not found",
    "code": "RESOURCE_NOT_FOUND",
    "statusCode": 404
  },
  "requestId": "..."
}
```

**Verification**:
- [ ] Status code is 404
- [ ] Error message specifies resource type
- [ ] Server does not crash

**Test Case**: Access non-existent API route
```bash
curl -X GET http://localhost:5000/api/nonexistent
```

**Expected Response**:
```json
{
  "success": false,
  "error": {
    "message": "API route not found",
    "code": "RESOURCE_NOT_FOUND",
    "statusCode": 404
  }
}
```

**Verification**:
- [ ] Status code is 404
- [ ] Error message indicates route not found
- [ ] Server does not crash

### 5. Conflict Errors (409)

**Test Case**: Create duplicate resource (e.g., vendor with existing email)
```bash
curl -X POST http://localhost:5000/api/vendors \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "email": "existing@example.com"}'
```

**Expected Response**:
```json
{
  "success": false,
  "error": {
    "message": "A vendor with this email already exists",
    "code": "RESOURCE_CONFLICT",
    "statusCode": 409
  },
  "requestId": "..."
}
```

**Verification**:
- [ ] Status code is 409
- [ ] Error message indicates conflict
- [ ] Server does not crash

**Test Case**: Delete item with existing stock
```bash
curl -X DELETE http://localhost:5000/api/items/<id_with_stock> \
  -H "Authorization: Bearer <token>"
```

**Expected Response**:
```json
{
  "success": false,
  "error": {
    "message": "Cannot delete item with existing stock quantities. Please clear stock first.",
    "code": "RESOURCE_CONFLICT",
    "statusCode": 409
  },
  "requestId": "..."
}
```

**Verification**:
- [ ] Status code is 409
- [ ] Error message explains business constraint
- [ ] Server does not crash

### 6. Timeout Errors (408)

**Test Case**: Trigger request timeout (requires simulating slow operation)

**Expected Response**:
```json
{
  "success": false,
  "error": {
    "message": "Request exceeded timeout limit",
    "code": "REQUEST_TIMEOUT",
    "statusCode": 408
  },
  "requestId": "..."
}
```

**Verification**:
- [ ] Status code is 408
- [ ] Error message indicates timeout
- [ ] Connection is closed
- [ ] Server does not crash

### 7. Database Errors (500)

**Test Case**: Simulate database connection failure (stop database)

**Expected Response**:
```json
{
  "success": false,
  "error": {
    "message": "Database operation failed",
    "code": "DB_QUERY_ERROR",
    "statusCode": 500
  },
  "requestId": "..."
}
```

**Verification**:
- [ ] Status code is 500
- [ ] Error message is generic (no sensitive details)
- [ ] Server does not crash
- [ ] Error is logged with full context

### 8. Internal Server Errors (500)

**Test Case**: Trigger unexpected error (requires code modification for testing)

**Expected Response**:
```json
{
  "success": false,
  "error": {
    "message": "An unexpected error occurred",
    "code": "SYSTEM_INTERNAL_ERROR",
    "statusCode": 500
  },
  "requestId": "..."
}
```

**Verification**:
- [ ] Status code is 500
- [ ] Error message is generic
- [ ] Server does not crash
- [ ] Error is logged with full stack trace

## 🔒 Process-Level Error Handling

### Test Case: Uncaught Exception

**Simulation**: Throw error outside request context
```javascript
// Add temporary code in server/index.ts after server starts
setTimeout(() => {
  throw new Error('Test uncaught exception');
}, 5000);
```

**Expected Behavior**:
1. Error is logged with full context
2. Server initiates graceful shutdown
3. Existing connections are allowed to complete (up to 10s)
4. Server exits with code 1

**Verification**:
- [ ] Error is logged to console
- [ ] "CRITICAL: Uncaught Exception occurred" message appears
- [ ] "Initiating graceful shutdown" message appears
- [ ] Server closes HTTP server
- [ ] Process exits after timeout or when connections close

### Test Case: Unhandled Promise Rejection

**Simulation**: Create unhandled promise rejection
```javascript
// Add temporary code in server/index.ts after server starts
setTimeout(() => {
  Promise.reject(new Error('Test unhandled rejection'));
}, 5000);
```

**Expected Behavior**:
1. Error is logged with full context
2. Server initiates graceful shutdown
3. Process exits with code 1

**Verification**:
- [ ] Error is logged to console
- [ ] "CRITICAL: Unhandled Promise Rejection occurred" message appears
- [ ] Server performs graceful shutdown

### Test Case: SIGTERM Signal

**Simulation**: Send SIGTERM to process
```bash
kill -TERM <pid>
```

**Expected Behavior**:
1. "SIGTERM received" message appears
2. Server initiates graceful shutdown
3. Process exits with code 0

**Verification**:
- [ ] Graceful shutdown message appears
- [ ] Server closes cleanly
- [ ] Exit code is 0

### Test Case: SIGINT Signal (Ctrl+C)

**Simulation**: Press Ctrl+C in terminal

**Expected Behavior**:
1. "SIGINT received" message appears
2. Server initiates graceful shutdown
3. Process exits with code 0

**Verification**:
- [ ] Graceful shutdown message appears
- [ ] Server closes cleanly
- [ ] Exit code is 0

## 📊 Error Logging Verification

### Test Case: Verify Log Levels

**4xx Errors (Client Errors)**:
- [ ] Logged at INFO level
- [ ] Includes request context (method, path, query, params)
- [ ] Includes requestId, userId, tenantId
- [ ] Does NOT include stack trace in production

**5xx Errors (Server Errors)**:
- [ ] Logged at ERROR level
- [ ] Includes full stack trace
- [ ] Includes request context
- [ ] Includes requestId, userId, tenantId

**Operational Errors**:
- [ ] Logged at WARN level
- [ ] Includes appropriate context

### Test Case: Verify Sensitive Data Sanitization

**Simulation**: Send request with sensitive data
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "secret123"}'
```

**Verification**:
- [ ] Password is NOT logged in plain text
- [ ] Password field shows "[REDACTED]" in logs
- [ ] Other sensitive fields (token, secret, key, etc.) are redacted

## 🔍 Request Tracking Verification

### Test Case: Request ID Tracking

**Simulation**: Make any API request
```bash
curl -X GET http://localhost:5000/api/items \
  -H "Authorization: Bearer <token>" \
  -v
```

**Verification**:
- [ ] Response includes X-Request-ID header
- [ ] Request ID is included in error responses
- [ ] Request ID is included in logs
- [ ] Request ID is consistent across logs for same request

**Simulation**: Send custom request ID
```bash
curl -X GET http://localhost:5000/api/items \
  -H "Authorization: Bearer <token>" \
  -H "X-Request-ID: custom-id-123" \
  -v
```

**Verification**:
- [ ] Custom request ID is used if valid format
- [ ] Invalid request IDs are replaced with generated ID

## 🛡️ Input Sanitization Verification

### Test Case: XSS Prevention

**Simulation**: Send malicious input
```bash
curl -X POST http://localhost:5000/api/vendors \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "<script>alert('xss')</script>"}'
```

**Verification**:
- [ ] Script tags are escaped/sanitized
- [ ] Data is stored safely
- [ ] No script execution occurs

### Test Case: SQL Injection Prevention

**Simulation**: Send SQL injection attempt
```bash
curl -X GET "http://localhost:5000/api/items?search='; DROP TABLE items; --" \
  -H "Authorization: Bearer <token>"
```

**Verification**:
- [ ] Query executes safely (Drizzle ORM provides protection)
- [ ] No database tables are affected
- [ ] Server does not crash

## 📝 Summary

After completing all test scenarios:

**Total Test Cases**: 30+
**Passed**: ___
**Failed**: ___
**Blocked**: ___

**Critical Issues Found**: ___
**Non-Critical Issues Found**: ___

**Overall Status**: ✅ PASS / ❌ FAIL

**Notes**:
- Document any issues found
- Verify fixes and re-test
- Update this checklist as needed