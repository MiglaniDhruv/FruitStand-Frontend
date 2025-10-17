# Purchase Invoice Deletion - Stock Movement Unlink Fix ✅

## Overview
Modified the `deletePurchaseInvoice` method to **unlink** stock movements instead of **deleting** them when a purchase invoice is deleted. This preserves stock movement history while making these entries available for future purchase invoice allocations.

## Implementation Date
October 17, 2025

---

## Problem Statement

### Original Behavior
The `deletePurchaseInvoice` method (lines 818-823) was **deleting** stock movements that referenced the invoice:

```typescript
// Delete stock movements
await tx.delete(stockMovements)
  .where(and(
    withTenant(stockMovements, tenantId),
    eq(stockMovements.purchaseInvoiceId, id)
  ));
```

### Issues with Original Approach
1. **Lost Historical Data**: Stock OUT entries represent actual inventory movements that occurred and should be preserved for audit trail
2. **Broken Inventory History**: Deleting these records removes important historical information about when and how stock was moved
3. **Inconsistent with Update Pattern**: The `updatePurchaseInvoice` method (lines 411-414) already uses the unlinking pattern by setting `purchaseInvoiceId` to NULL

---

## Solution Implemented

### New Behavior
The method now **unlinks** stock movements by setting their `purchaseInvoiceId` to NULL:

```typescript
// Unlink stock movements from this invoice
await tx.update(stockMovements)
  .set({ purchaseInvoiceId: null })
  .where(and(
    withTenant(stockMovements, tenantId),
    eq(stockMovements.purchaseInvoiceId, id)
  ));
```

### Changes Made

**File**: `server/src/modules/purchase-invoices/model.ts`

**Location**: Lines 818-824 (within the `deletePurchaseInvoice` method)

**Specific Changes**:
1. Changed operation from `tx.delete(stockMovements)` to `tx.update(stockMovements)`
2. Added `.set({ purchaseInvoiceId: null })` to set the foreign key to NULL
3. Maintained the same WHERE conditions with tenant filtering
4. Updated comment from "Delete stock movements" to "Unlink stock movements from this invoice"

---

## Benefits

### 1. Preserves Stock Movement History
- Stock OUT entries remain in the database with their original timestamps, quantities, and other metadata
- Provides complete audit trail of all inventory movements
- Enables historical reporting and analysis

### 2. Makes Entries Available for Reallocation
- Setting `purchaseInvoiceId` to NULL makes these stock OUT entries "available" again
- They can be linked to other purchase invoices in the future
- Aligns with the design pattern in `getAvailableStockOutEntriesByVendor` method

### 3. Consistency with Existing Patterns

#### Update Invoice Pattern
The `updatePurchaseInvoice` method already uses this unlinking pattern (lines 411-414):

```typescript
// Unlink all existing stock movements from this invoice
await tx.update(stockMovements)
  .set({ purchaseInvoiceId: null })
  .where(and(
    withTenant(stockMovements, tenantId),
    eq(stockMovements.purchaseInvoiceId, id)
  ));
```

#### Available Stock OUT Entries Pattern
The `getAvailableStockOutEntriesByVendor` method in `server/src/modules/stock/model.ts` (line 284) filters for available entries:

```typescript
isNull(stockMovements.purchaseInvoiceId)  // Only stock OUT entries not linked to any invoice
```

This confirms that NULL `purchaseInvoiceId` means "available for allocation".

---

## Technical Details

### Transaction Boundary
- The change maintains the existing transaction boundary
- All operations remain within the `db.transaction` block
- Order of operations unchanged

### Tenant Scoping
- Uses the same `withTenant` helper for tenant isolation
- Ensures only stock movements from the correct tenant are updated
- Maintains multi-tenant data integrity

### Operation Sequence
The deletion sequence remains the same:

1. Fetch and validate invoice (UNPAID status only)
2. Fetch crate transactions
3. Reverse vendor crate balance
4. Delete crate transactions
5. Reverse vendor monetary balance
6. Delete invoice share links
7. **Unlink stock movements** ⬅️ **CHANGED FROM DELETE TO UPDATE**
8. Delete payments
9. Delete invoice items
10. Delete purchase invoice
11. Commit transaction

---

## Database Schema Context

### Stock Movements Table
The `stockMovements` table has a nullable `purchaseInvoiceId` field:

```typescript
purchaseInvoiceId: varchar("purchase_invoice_id", { length: 50 })
  .references(() => purchaseInvoices.id, { onDelete: 'set null' }),
```

**Key Points**:
- The field is **nullable** by design
- Foreign key constraint has `onDelete: 'set null'`
- This schema design explicitly supports the unlinking pattern

### Stock Movement Types
Stock movements can be:
- **IN**: Stock added to inventory (from purchases)
- **OUT**: Stock removed from inventory (linked to purchase invoices)
- **ADJUSTMENT**: Manual adjustments

The fix specifically affects **OUT** movements that were linked to the deleted purchase invoice.

---

## Impact Analysis

### What Changes
1. **Stock movements are preserved** when a purchase invoice is deleted
2. **Stock movements become available** for linking to other invoices
3. **Historical data remains intact** for audit and reporting

### What Stays the Same
1. Transaction boundary and error handling
2. Tenant scoping and isolation
3. Order of deletion operations
4. All other deletion logic (payments, items, invoice, etc.)
5. Invoice validation (UNPAID status only)

### No Breaking Changes
- The API remains unchanged
- The method signature is the same
- Return value is the same (boolean)
- Error handling is the same

---

## Testing Considerations

### Test Scenarios

#### 1. Delete Invoice with Stock Movements
**Setup**:
- Create a purchase invoice
- Link stock OUT entries to the invoice
- Delete the invoice

**Expected Result**:
- Invoice deleted successfully
- Stock movements remain in database
- Stock movements have `purchaseInvoiceId = NULL`
- Stock movements are available for future allocation

#### 2. Stock Movement Availability After Deletion
**Setup**:
- Create a purchase invoice with stock OUT entries
- Delete the invoice
- Query available stock OUT entries for the vendor

**Expected Result**:
- Previously linked stock OUT entries appear in available list
- They can be linked to a new purchase invoice

#### 3. Historical Data Integrity
**Setup**:
- Create and delete multiple purchase invoices over time
- Query stock movement history

**Expected Result**:
- All stock movements remain in database
- Historical timestamps preserved
- Complete audit trail available

#### 4. Transaction Rollback
**Setup**:
- Simulate an error during invoice deletion (after stock movement update but before final delete)

**Expected Result**:
- Entire transaction rolls back
- Stock movements remain linked to original invoice
- Database state unchanged

---

## Verification Checklist

### Code Review
- ✅ Changed from `tx.delete()` to `tx.update().set()`
- ✅ Set `purchaseInvoiceId` to `null`
- ✅ Maintained tenant filtering with `withTenant`
- ✅ Maintained foreign key filter with `eq(stockMovements.purchaseInvoiceId, id)`
- ✅ Updated comment to reflect new behavior
- ✅ No TypeScript errors

### Pattern Consistency
- ✅ Matches `updatePurchaseInvoice` unlinking pattern
- ✅ Aligns with `getAvailableStockOutEntriesByVendor` filtering logic
- ✅ Consistent with schema design (`onDelete: 'set null'`)

### Transaction Integrity
- ✅ Operation remains within transaction block
- ✅ Order of operations unchanged
- ✅ Error handling unchanged

---

## Related Code References

### 1. Update Purchase Invoice (Existing Pattern)
**File**: `server/src/modules/purchase-invoices/model.ts`  
**Lines**: 411-414

```typescript
// Unlink all existing stock movements from this invoice
await tx.update(stockMovements)
  .set({ purchaseInvoiceId: null })
  .where(and(
    withTenant(stockMovements, tenantId),
    eq(stockMovements.purchaseInvoiceId, id)
  ));
```

### 2. Get Available Stock OUT Entries
**File**: `server/src/modules/stock/model.ts`  
**Line**: 284

```typescript
isNull(stockMovements.purchaseInvoiceId)  // Filter for available entries
```

### 3. Stock Movements Schema
**File**: `shared/schema.ts`

```typescript
purchaseInvoiceId: varchar("purchase_invoice_id", { length: 50 })
  .references(() => purchaseInvoices.id, { onDelete: 'set null' }),
```

---

## Migration Notes

### No Database Migration Required
- The change is purely behavioral (UPDATE vs DELETE)
- No schema changes needed
- Existing data unaffected

### Backward Compatibility
- **Fully backward compatible**
- No API changes
- No breaking changes to client code

### Production Deployment
- **Safe to deploy** without downtime
- No data migration scripts needed
- No special rollback procedures required

---

## Summary

### Problem
Stock movements were being **deleted** when purchase invoices were deleted, causing loss of historical data.

### Solution
Stock movements are now **unlinked** (set `purchaseInvoiceId` to NULL) instead of deleted, preserving history while making entries available for reallocation.

### Impact
- ✅ Preserves stock movement history
- ✅ Maintains audit trail
- ✅ Enables entry reallocation
- ✅ Consistent with existing patterns
- ✅ No breaking changes

### Status
✅ **COMPLETE** - Implementation successful with no TypeScript errors

---

**Implementation File**: `server/src/modules/purchase-invoices/model.ts`  
**Lines Modified**: 818-824  
**Method**: `deletePurchaseInvoice`  
**Change Type**: Behavioral fix (DELETE → UPDATE)  
**Breaking Changes**: None  
**Testing Required**: Manual/Integration testing recommended
