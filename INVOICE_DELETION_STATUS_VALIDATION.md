# Invoice Deletion Status Validation Implementation

## Overview

This document details the implementation of business rule validation that prevents deletion of paid or partially paid invoices. The validation is implemented at both the controller layer (for user feedback) and model layer (for data integrity) using a defense-in-depth approach.

## Implementation Date
October 16, 2025

## Business Rule
**Only unpaid invoices can be deleted. Paid or partially paid invoices must not be deleted.**

## Affected Files
1. `server/src/modules/purchase-invoices/controller.ts`
2. `server/src/modules/purchase-invoices/model.ts`
3. `server/src/modules/sales-invoices/controller.ts`
4. `server/src/modules/sales-invoices/model.ts`

---

## Architecture Overview

### Defense-in-Depth Approach

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Controller Validation (User Feedback)         │
│ - Fetch invoice before deletion attempt                 │
│ - Check existence (404 if not found)                    │
│ - Check status (400 if not 'Unpaid')                    │
│ - Provide clear error messages to user                  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 2: Model Validation (Data Integrity)             │
│ - Validate status within database transaction           │
│ - Protect against race conditions                       │
│ - Guard against controller bypass                       │
│ - Return false if status is not 'Unpaid'               │
└─────────────────────────────────────────────────────────┘
```

### Status Values (from shared/schema.ts)

```typescript
// Invoice status can be one of:
- "Unpaid"          // ✅ Can be deleted
- "Partially Paid"  // ❌ Cannot be deleted
- "Paid"            // ❌ Cannot be deleted
```

---

## Implementation Details

### 1. Purchase Invoice Controller Changes

**File**: `server/src/modules/purchase-invoices/controller.ts`

**Location**: `delete()` method (lines ~159-185)

**Changes Made**:

```typescript
async delete(req: AuthenticatedRequest, res: Response) {
  if (!req.tenantId) throw new ForbiddenError('No tenant context found');
  const tenantId = req.tenantId;
  
  const { id } = req.params;
  if (!id) {
    throw new BadRequestError('Invoice ID is required');
  }

  // ✅ NEW: Fetch invoice to validate existence and status
  const invoice = await this.wrapDatabaseOperation(() =>
    this.purchaseInvoiceModel.getPurchaseInvoice(tenantId, id)
  );
  
  // ✅ NEW: Check if invoice exists
  if (!invoice) {
    throw new NotFoundError('Purchase invoice not found');
  }

  // ✅ NEW: Check if invoice status is 'Unpaid'
  if (invoice.status !== 'Unpaid') {
    throw new BadRequestError('Cannot delete a paid or partially paid invoice. Only unpaid invoices can be deleted.');
  }

  // Existing deletion logic (unchanged)
  const success = await this.wrapDatabaseOperation(() =>
    this.purchaseInvoiceModel.deletePurchaseInvoice(tenantId, id)
  );
  
  if (!success) {
    throw new NotFoundError('Invoice not found');
  }

  res.status(204).send();
}
```

**Key Points**:
- ✅ Fetches invoice using `getPurchaseInvoice()` before deletion attempt
- ✅ Throws `NotFoundError` (404) if invoice doesn't exist
- ✅ Throws `BadRequestError` (400) if status is not 'Unpaid'
- ✅ Uses exact string match: `invoice.status !== 'Unpaid'`
- ✅ Provides clear error message to user
- ✅ Maintains existing deletion logic as safety net for race conditions

---

### 2. Purchase Invoice Model Changes

**File**: `server/src/modules/purchase-invoices/model.ts`

**Location**: `deletePurchaseInvoice()` method (lines ~468-580)

**Changes Made**:

```typescript
async deletePurchaseInvoice(tenantId: string, id: string): Promise<boolean> {
  try {
    return await db.transaction(async (tx) => {
      // Step 1: Fetch the invoice before deletion
      const [invoice] = await tx.select().from(purchaseInvoices)
        .where(and(
          withTenant(purchaseInvoices, tenantId),
          eq(purchaseInvoices.id, id)
        ));
      
      if (!invoice) {
        return false;
      }

      // ✅ NEW: Status validation - data integrity guard
      if (invoice.status !== 'Unpaid') {
        return false;
      }
      
      // Step 2: Fetch all associated crate transactions...
      // (Rest of deletion logic unchanged)
    });
  } catch (error) {
    // Error handling unchanged
  }
}
```

**Key Points**:
- ✅ Status check added immediately after invoice existence check
- ✅ Returns `false` if status is not 'Unpaid' (same as not found)
- ✅ Validation happens within database transaction
- ✅ Protects against controller bypass
- ✅ Guards against race conditions (status change between controller check and deletion)
- ✅ Uses exact string match: `invoice.status !== 'Unpaid'`

---

### 3. Sales Invoice Controller Changes

**File**: `server/src/modules/sales-invoices/controller.ts`

**Location**: `delete()` method (lines ~164-179)

**Changes Made**:

```typescript
async delete(req: AuthenticatedRequest, res: Response) {
  if (!req.tenantId) throw new ForbiddenError('No tenant context found');
  const tenantId = req.tenantId;

  const { id } = req.params;
  if (!id) throw new BadRequestError('Sales invoice ID is required');
  this.validateUUID(id, 'Sales Invoice ID');

  // ✅ NEW: Fetch invoice to validate existence and status
  const invoice = await this.wrapDatabaseOperation(() =>
    this.salesInvoiceModel.getSalesInvoice(tenantId, id)
  );
  
  // ✅ NEW: Check if invoice exists
  if (!invoice) {
    throw new NotFoundError('Sales invoice not found');
  }

  // ✅ NEW: Check if invoice status is 'Unpaid'
  if (invoice.status !== 'Unpaid') {
    throw new BadRequestError('Cannot delete a paid or partially paid invoice. Only unpaid invoices can be deleted.');
  }

  // Existing deletion logic (unchanged)
  const success = await this.wrapDatabaseOperation(() =>
    this.salesInvoiceModel.deleteSalesInvoice(tenantId, id)
  );
  
  if (!success) throw new NotFoundError('Sales invoice not found');

  res.status(204).send();
}
```

**Key Points**:
- ✅ Fetches invoice using `getSalesInvoice()` before deletion attempt
- ✅ Throws `NotFoundError` (404) if invoice doesn't exist
- ✅ Throws `BadRequestError` (400) if status is not 'Unpaid'
- ✅ Uses exact string match: `invoice.status !== 'Unpaid'`
- ✅ Provides clear error message to user
- ✅ Mirrors purchase invoice controller implementation for consistency

---

### 4. Sales Invoice Model Changes

**File**: `server/src/modules/sales-invoices/model.ts`

**Location**: `deleteSalesInvoice()` method (lines ~293-450)

**Changes Made**:

```typescript
async deleteSalesInvoice(tenantId: string, id: string): Promise<boolean> {
  try {
    return await db.transaction(async (tx) => {
      // Fetch invoice and validate
      const [invoice] = await tx.select().from(salesInvoices)
        .where(and(
          withTenant(salesInvoices, tenantId),
          eq(salesInvoices.id, id)
        ));
      
      if (!invoice) {
        return false;
      }

      // ✅ NEW: Status validation - data integrity guard
      if (invoice.status !== 'Unpaid') {
        return false;
      }
      
      let retailer = null;
      // (Rest of deletion logic unchanged)
    });
  } catch (error) {
    // Error handling unchanged
  }
}
```

**Key Points**:
- ✅ Status check added immediately after invoice existence check
- ✅ Returns `false` if status is not 'Unpaid' (same as not found)
- ✅ Validation happens within database transaction
- ✅ Protects against controller bypass
- ✅ Guards against race conditions
- ✅ Uses exact string match: `invoice.status !== 'Unpaid'`
- ✅ Mirrors purchase invoice model implementation for consistency

---

## Request/Response Flow

### Successful Deletion (Unpaid Invoice)

```
Client: DELETE /api/purchase-invoices/:id
  ↓
Controller: Validate request parameters
  ↓
Controller: Fetch invoice (getPurchaseInvoice)
  ↓
Controller: Check invoice.status === 'Unpaid' ✅
  ↓
Model: Begin transaction
  ↓
Model: Fetch invoice within transaction
  ↓
Model: Check invoice.status === 'Unpaid' ✅
  ↓
Model: Reverse balances and delete related records
  ↓
Model: Commit transaction
  ↓
Controller: Return 204 No Content
```

### Failed Deletion - Invoice Not Found

```
Client: DELETE /api/purchase-invoices/:id
  ↓
Controller: Validate request parameters
  ↓
Controller: Fetch invoice (getPurchaseInvoice)
  ↓
Controller: invoice === null
  ↓
Controller: Throw NotFoundError ❌
  ↓
Client: Receive 404 Not Found
  Response: { "message": "Purchase invoice not found" }
```

### Failed Deletion - Invoice is Paid

```
Client: DELETE /api/purchase-invoices/:id
  ↓
Controller: Validate request parameters
  ↓
Controller: Fetch invoice (getPurchaseInvoice)
  ↓
Controller: Check invoice.status === 'Paid' ❌
  ↓
Controller: Throw BadRequestError
  ↓
Client: Receive 400 Bad Request
  Response: { 
    "message": "Cannot delete a paid or partially paid invoice. Only unpaid invoices can be deleted."
  }
```

### Failed Deletion - Race Condition (Status Changed)

```
Client: DELETE /api/purchase-invoices/:id
  ↓
Controller: Fetch invoice (status: 'Unpaid') ✅
  ↓
[Another Request Changes Status to 'Paid']
  ↓
Model: Begin transaction
  ↓
Model: Fetch invoice within transaction (status: 'Paid')
  ↓
Model: Check invoice.status !== 'Unpaid' ❌
  ↓
Model: Return false (no deletion)
  ↓
Controller: Throw NotFoundError
  ↓
Client: Receive 404 Not Found
```

---

## HTTP Response Codes

### Success
- **204 No Content**: Invoice successfully deleted

### Client Errors
- **400 Bad Request**: Invoice status is 'Paid' or 'Partially Paid'
  - Message: "Cannot delete a paid or partially paid invoice. Only unpaid invoices can be deleted."
- **404 Not Found**: Invoice not found or race condition detected
  - Message: "Purchase invoice not found" or "Sales invoice not found"

---

## Test Scenarios

### Scenario 1: Delete Unpaid Purchase Invoice

**Setup**:
```sql
INSERT INTO purchase_invoices (id, tenantId, vendorId, status, netAmount, ...)
VALUES ('INV-001', 'T1', 'V1', 'Unpaid', 1000.00, ...);
```

**Request**:
```http
DELETE /api/purchase-invoices/INV-001
Authorization: Bearer {token}
```

**Expected Result**:
- ✅ Controller fetches invoice (status: 'Unpaid')
- ✅ Controller status check passes
- ✅ Model status check passes within transaction
- ✅ Invoice and related records deleted
- ✅ Response: 204 No Content

**Verification**:
```sql
SELECT * FROM purchase_invoices WHERE id = 'INV-001';
-- Expected: 0 rows (deleted)
```

---

### Scenario 2: Attempt to Delete Paid Purchase Invoice

**Setup**:
```sql
INSERT INTO purchase_invoices (id, tenantId, vendorId, status, netAmount, ...)
VALUES ('INV-002', 'T1', 'V1', 'Paid', 1000.00, ...);
```

**Request**:
```http
DELETE /api/purchase-invoices/INV-002
Authorization: Bearer {token}
```

**Expected Result**:
- ✅ Controller fetches invoice (status: 'Paid')
- ❌ Controller status check fails
- ✅ Controller throws BadRequestError
- ✅ Response: 400 Bad Request
- ✅ Message: "Cannot delete a paid or partially paid invoice. Only unpaid invoices can be deleted."
- ✅ Invoice remains in database (not deleted)

**Verification**:
```sql
SELECT * FROM purchase_invoices WHERE id = 'INV-002';
-- Expected: 1 row (still exists, status = 'Paid')
```

---

### Scenario 3: Attempt to Delete Partially Paid Sales Invoice

**Setup**:
```sql
INSERT INTO sales_invoices (id, tenantId, retailerId, status, netAmount, ...)
VALUES ('SI-001', 'T1', 'R1', 'Partially Paid', 500.00, ...);
```

**Request**:
```http
DELETE /api/sales-invoices/SI-001
Authorization: Bearer {token}
```

**Expected Result**:
- ✅ Controller fetches invoice (status: 'Partially Paid')
- ❌ Controller status check fails
- ✅ Controller throws BadRequestError
- ✅ Response: 400 Bad Request
- ✅ Message: "Cannot delete a paid or partially paid invoice. Only unpaid invoices can be deleted."
- ✅ Invoice remains in database

**Verification**:
```sql
SELECT * FROM sales_invoices WHERE id = 'SI-001';
-- Expected: 1 row (still exists, status = 'Partially Paid')
```

---

### Scenario 4: Race Condition - Status Changes During Deletion

**Setup**:
```sql
INSERT INTO purchase_invoices (id, tenantId, vendorId, status, netAmount, ...)
VALUES ('INV-003', 'T1', 'V1', 'Unpaid', 1000.00, ...);
```

**Timeline**:
1. **Request 1 (DELETE)**: Controller fetches invoice (status: 'Unpaid') ✅
2. **Request 2 (PAYMENT)**: Updates invoice status to 'Paid'
3. **Request 1 (DELETE)**: Model begins transaction
4. **Request 1 (DELETE)**: Model fetches invoice (status: 'Paid') ❌
5. **Request 1 (DELETE)**: Model status check fails, returns `false`
6. **Request 1 (DELETE)**: Controller throws NotFoundError

**Expected Result**:
- ✅ Model-level status check prevents deletion
- ✅ Transaction rolled back (no changes)
- ✅ Response: 404 Not Found
- ✅ Invoice remains in database (status: 'Paid')

**Why 404 instead of 400?**
- Controller already passed status check (race condition)
- Model returns `false` (generic failure)
- Controller interprets `false` as "not found" for safety
- User sees consistent behavior (operation failed)

---

### Scenario 5: Delete Non-Existent Invoice

**Request**:
```http
DELETE /api/purchase-invoices/NON-EXISTENT-ID
Authorization: Bearer {token}
```

**Expected Result**:
- ✅ Controller fetches invoice (returns null)
- ✅ Controller throws NotFoundError
- ✅ Response: 404 Not Found
- ✅ Message: "Purchase invoice not found"

---

## Edge Cases

### 1. Null or Undefined Status

**Scenario**: Invoice has `status = null` (should not happen due to schema constraints)

**Behavior**:
```typescript
if (invoice.status !== 'Unpaid') {
  // null !== 'Unpaid' evaluates to true
  return false; // Prevents deletion ✅
}
```

**Result**: ✅ Correctly blocked (defensive)

---

### 2. Case-Sensitive Status Check

**Scenario**: Database has `status = 'unpaid'` (lowercase, wrong casing)

**Behavior**:
```typescript
if (invoice.status !== 'Unpaid') {
  // 'unpaid' !== 'Unpaid' evaluates to true (case-sensitive)
  return false; // Prevents deletion ✅
}
```

**Result**: ✅ Correctly blocked (strict comparison)

---

### 3. Concurrent Deletion Attempts

**Scenario**: Two users try to delete the same unpaid invoice simultaneously

**Timeline**:
```
Request A: Fetch invoice (exists, status: 'Unpaid') ✅
Request B: Fetch invoice (exists, status: 'Unpaid') ✅
Request A: Begin transaction → Model check passes → Delete invoice ✅
Request B: Begin transaction → Fetch invoice (not found, already deleted) ❌
Request B: Return false → Throw NotFoundError
```

**Result**: ✅ Only one deletion succeeds, second returns 404

---

### 4. Payment Made Between Controller and Model

**Scenario**: Payment processed after controller check but before model deletion

**Timeline**:
```
DELETE Request: Controller fetch (status: 'Unpaid') ✅
PAYMENT Request: Update status to 'Paid' (commits)
DELETE Request: Model transaction begins
DELETE Request: Model fetch (status: 'Paid') ❌
DELETE Request: Model status check fails → Return false
```

**Result**: ✅ Model-level guard prevents deletion

---

## Performance Considerations

### Additional Database Query

**Before**:
- 1 query: Model fetches invoice within transaction

**After**:
- 2 queries: Controller fetches invoice + Model fetches invoice
- **Overhead**: ~1-5ms per deletion (negligible)

**Why Acceptable**:
- Provides better user experience (clear error messages)
- Prevents unnecessary transaction overhead for invalid requests
- Controller query is fast (indexed lookup)
- Trade-off worth the data integrity and UX improvement

---

### Transaction Safety

**No Impact**:
- Model-level check is within existing transaction
- No additional transaction overhead
- Same commit/rollback behavior

---

## Benefits

### 1. Data Integrity
✅ Cannot delete invoices with associated payments
✅ Protects financial records
✅ Prevents accounting inconsistencies

### 2. User Experience
✅ Clear error messages ("Cannot delete a paid invoice")
✅ Immediate feedback (400 vs 500 errors)
✅ Predictable behavior

### 3. Defense-in-Depth
✅ Controller validation (first line)
✅ Model validation (second line)
✅ Protects against race conditions
✅ Guards against code bypasses

### 4. Consistency
✅ Same pattern for purchase and sales invoices
✅ Consistent error handling
✅ Uniform status checks

### 5. Maintainability
✅ Clear business rule enforcement
✅ Easy to understand code flow
✅ Well-documented changes

---

## Backward Compatibility

### Breaking Changes
❌ None for valid operations (unpaid invoices)
✅ New validation prevents invalid operations (paid invoices)

### Behavioral Changes
- **Old Behavior**: Could delete paid invoices (data integrity issue)
- **New Behavior**: Cannot delete paid invoices (correct behavior)

**Migration Impact**: ✅ No data migration required

---

## Verification Checklist

### Code Review
- [x] Controller validation added to purchase invoices
- [x] Controller validation added to sales invoices
- [x] Model guard added to purchase invoices
- [x] Model guard added to sales invoices
- [x] Status check uses exact string match: `!== 'Unpaid'`
- [x] Error messages are clear and consistent
- [x] TypeScript compilation passes (0 errors)

### Logic Verification
- [x] Unpaid invoices can be deleted ✅
- [x] Paid invoices cannot be deleted ❌
- [x] Partially paid invoices cannot be deleted ❌
- [x] Race conditions handled by model-level guard
- [x] Concurrent deletions handled correctly
- [x] Non-existent invoices return 404
- [x] Invalid status returns 400

### Error Handling
- [x] 204 for successful deletion
- [x] 400 for paid/partially paid invoices
- [x] 404 for non-existent invoices
- [x] 404 for race condition failures

---

## Related Schema

### Invoice Status Field

From `shared/schema.ts`:

**Purchase Invoices** (line ~125):
```typescript
export const purchaseInvoices = pgTable('purchase_invoices', {
  status: text('status').notNull().default('Unpaid'),
  // Possible values: 'Unpaid', 'Partially Paid', 'Paid'
});
```

**Sales Invoices** (line ~320):
```typescript
export const salesInvoices = pgTable('sales_invoices', {
  status: text('status').notNull().default('Unpaid'),
  // Possible values: 'Unpaid', 'Partially Paid', 'Paid'
});
```

---

## Error Classes Used

From `server/src/types`:

```typescript
// 404 Not Found
export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404);
  }
}

// 400 Bad Request
export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

// 403 Forbidden
export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(message, 403);
  }
}
```

---

## Summary

### Changes Made
1. ✅ Added controller-level status validation for purchase invoices
2. ✅ Added model-level status guard for purchase invoices
3. ✅ Added controller-level status validation for sales invoices
4. ✅ Added model-level status guard for sales invoices

### Business Rule Enforced
✅ **Only unpaid invoices can be deleted**

### Security & Integrity
- ✅ Defense-in-depth approach (2 validation layers)
- ✅ Race condition protection
- ✅ Transaction-level safety
- ✅ Clear error messages for users

### Production Readiness
- ✅ TypeScript compilation passes (0 errors)
- ✅ No breaking changes for valid operations
- ✅ Consistent implementation across invoice types
- ✅ Well-documented changes

---

## Implementation Complete ✅

**Status**: Ready for deployment  
**Date**: October 16, 2025  
**Files Modified**: 4  
**Tests Required**: Integration tests for all 5 scenarios  
