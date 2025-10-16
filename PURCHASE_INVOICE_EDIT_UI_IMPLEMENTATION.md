# Purchase Invoice Edit Implementation

## Overview
This document details the complete implementation of edit functionality for purchase invoices, following the exact pattern established in the sales invoice edit implementation.

---

## Files Modified

### 1. client/src/pages/purchase-invoices.tsx

**Changes Implemented:**

#### Import Updates
- ✅ Added `Pencil` icon to lucide-react imports

#### State Management
- ✅ Added `editingInvoice` state: `useState<InvoiceWithItems | null>(null)`
  - Holds the invoice being edited
  - `null` when creating a new invoice

#### Handler Functions

**handleCreateNew()**
- ✅ Resets `editingInvoice` to `null` (ensures create mode)
- ✅ Opens modal by setting `showCreateModal` to `true`
- ✅ Includes try-catch error handling with toast notifications
- ✅ Logs errors using `logEventHandlerError`

**handleEdit(invoice: InvoiceWithItems)**
- ✅ Sets `editingInvoice` to the passed invoice
- ✅ Opens modal by setting `showCreateModal` to `true`
- ✅ Includes try-catch error handling with toast notifications
- ✅ Logs errors using `logEventHandlerError`

#### UI Updates

**Create Invoice Button**
- ✅ Changed from `onClick={() => setShowCreateModal(true)}`
- ✅ To: `onClick={handleCreateNew}`
- ✅ Ensures proper state reset when creating new invoice

**Actions Column - Edit Button**
- ✅ Added Edit button between View and Delete buttons
- ✅ Uses `<Pencil className="h-4 w-4" />` icon
- ✅ Conditionally rendered: `invoice.status === "Unpaid"` only
- ✅ Includes accessibility attributes:
  - `title="Edit Invoice"`
  - `data-testid="button-edit-{invoice.id}"`
- ✅ Calls `handleEdit(invoice)` on click
- ✅ Uses `variant="ghost"` and `size="icon"`

**PurchaseInvoiceModal Props**
- ✅ Added `invoice={editingInvoice}` prop
- ✅ Passes the invoice being edited to the modal

---

### 2. client/src/components/forms/purchase-invoice-modal.tsx

**Changes Implemented:**

#### Import Updates
- ✅ Added `InvoiceWithItems` import from `@shared/schema`

#### Interface Updates
```typescript
interface PurchaseInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: InvoiceWithItems | null;  // ✅ Added
}
```

#### Component Signature
- ✅ Updated to accept `invoice` prop
- ✅ Changed from: `({ open, onOpenChange }: PurchaseInvoiceModalProps)`
- ✅ To: `({ open, onOpenChange, invoice }: PurchaseInvoiceModalProps)`

#### Form Population useEffect

**New useEffect Hook (after existing useEffects)**
- ✅ Watches `[invoice, open, form, toast]` dependencies
- ✅ Triggers when `invoice` is provided and modal is `open`
- ✅ Populates all form fields:
  
  **Basic Fields:**
  - `vendorId`: invoice.vendorId
  - `invoiceDate`: Formatted as YYYY-MM-DD using `.toISOString().split('T')[0]`
  
  **Invoice Items:**
  - Maps invoice.items array to form structure
  - Converts all numeric values to strings
  - Handles optional fields (crates, boxes) with fallback to empty string
  
  **Expense Fields (with null coalescing):**
  - commission, labour, truckFreight, crateFreight
  - postExpenses, draftExpenses, vatav, otherExpenses
  - advance
  - All use `?? 0` to handle null values
  
  **Calculated Fields:**
  - totalExpense, totalSelling, totalLessExpenses, netAmount
  
  **Crate Transaction:**
  - Checks if `(invoice as any).crateTransaction` exists
  - Sets `crateTransaction.enabled` to `true`
  - Sets `crateTransaction.quantity` from existing transaction

- ✅ Sets `selectedVendorId` state
- ✅ Includes try-catch error handling
- ✅ Shows toast notification on error

#### Mutation Updates

**createInvoiceMutation (renamed for dual purpose)**

**mutationFn Changes:**
- ✅ Detects edit mode: `const isEditMode = !!invoice`
- ✅ Conditional request data:
  - **Create mode**: Includes `stockOutEntryIds` if any selected
  - **Edit mode**: Excludes `stockOutEntryIds` (stock already linked)
- ✅ Conditional endpoint:
  - **Create**: `/api/purchase-invoices`
  - **Edit**: `/api/purchase-invoices/${invoice.id}`
- ✅ Conditional method:
  - **Create**: `POST`
  - **Edit**: `PUT`

**onSuccess Changes:**
- ✅ Dynamic toast title: `"Invoice updated"` vs `"Invoice created"`
- ✅ Dynamic toast description:
  - With crate transaction: "... and crate transaction updated/created successfully"
  - Without crate transaction: "... updated/created successfully"
- ✅ Same query invalidation for both modes
- ✅ Same form reset and modal close logic

**onError Changes:**
- ✅ Dynamic error message: `"Failed to update invoice"` vs `"Failed to create invoice"`
- ✅ Same error parsing logic for both modes

#### UI Updates

**Modal Title**
- ✅ Changed from: `title="Create Purchase Invoice"`
- ✅ To: `title={invoice ? "Edit Purchase Invoice" : "Create Purchase Invoice"}`

**Stock Out Entries Section**
- ✅ Changed condition from: `{selectedVendorId && availableStockOutEntries && ...`
- ✅ To: `{!invoice && selectedVendorId && availableStockOutEntries && ...`
- ✅ **Rationale**: Stock entries are already linked in edit mode and cannot be changed

**Submit Button**
- ✅ Dynamic button text:
  - Loading state: `"Updating..."` vs `"Creating..."`
  - Normal state: `"Update Invoice"` vs `"Create Invoice"`
- ✅ Implementation:
  ```typescript
  {createInvoiceMutation.isPending 
    ? (invoice ? "Updating..." : "Creating...") 
    : (invoice ? "Update Invoice" : "Create Invoice")}
  ```

---

## Technical Details

### Edit Mode Detection
The modal uses a simple pattern to detect edit mode:
```typescript
const isEditMode = !!invoice;
```

### Status Filtering
Edit button only appears for invoices with status `"Unpaid"`:
- Backend validation ensures only unpaid invoices can be edited
- UI prevents users from attempting to edit paid/partially paid invoices
- **Important**: Status value is `"Unpaid"` (not `"Pending"`)

### Stock Out Entries Handling
- **Create Mode**: User can select multiple stock OUT entries to link
- **Edit Mode**: Section is hidden (stock entries already linked to invoice)
- **Backend**: Edit endpoint does NOT accept `stockOutEntryIds` parameter
- **Backend**: Existing stock entry links are maintained during update

### Form Data Conversion
When populating the edit form:
- All numeric values converted to strings (form expects string inputs)
- Null values handled with `?? 0` operator
- Optional fields (crates, boxes) use `|| ''` fallback
- Date formatted using `.toISOString().split('T')[0]`

### Crate Transaction Handling
- Type assertion used: `(invoice as any).crateTransaction`
- **Reason**: `InvoiceWithItems` type doesn't include crate transaction
- Checked for existence before accessing properties
- If exists, enables crate transaction and populates quantity

### Error Handling
All handlers include comprehensive error handling:
- Try-catch blocks in event handlers
- Error logging using `logEventHandlerError`
- Toast notifications for user feedback
- Specific error messages for edit vs create operations

---

## User Flow

### Edit Workflow
1. User navigates to Purchase Invoices page
2. User sees Edit button (pencil icon) for Unpaid invoices only
3. User clicks Edit button
4. `handleEdit()` sets `editingInvoice` state and opens modal
5. Modal receives `invoice` prop and detects edit mode
6. `useEffect` populates form with existing invoice data
7. Modal title shows "Edit Purchase Invoice"
8. Stock out entries section is hidden
9. Submit button shows "Update Invoice"
10. User modifies invoice data
11. User clicks "Update Invoice"
12. Mutation detects edit mode and uses PUT method
13. Backend updates invoice (status must be Unpaid)
14. Success toast: "Invoice updated successfully"
15. Queries invalidated, table refreshes
16. Modal closes, form resets

### Create Workflow (Unchanged)
1. User clicks "Create Invoice" button
2. `handleCreateNew()` resets `editingInvoice` to null and opens modal
3. Modal receives `null` invoice prop (create mode)
4. Form uses default values
5. Modal title shows "Create Purchase Invoice"
6. Stock out entries section is visible (if vendor selected)
7. Submit button shows "Create Invoice"
8. (Rest of flow same as before)

---

## API Integration

### Edit Endpoint
- **Method**: PUT
- **URL**: `/api/purchase-invoices/:id`
- **Request Body**:
  ```typescript
  {
    invoice: {
      vendorId: string,
      invoiceDate: Date,
      commission: number,
      labour: number,
      // ... all other invoice fields
    },
    items: [
      {
        itemId: string,
        weight: number,
        crates: number | null,
        boxes: number | null,
        rate: number,
        amount: number
      }
    ],
    crateTransaction?: {
      partyType: 'vendor',
      vendorId: string,
      transactionType: 'Given' | 'Received',
      quantity: number,
      transactionDate: Date,
      notes?: string
    }
    // Note: stockOutEntryIds NOT included in edit mode
  }
  ```
- **Response**: Updated `InvoiceWithItems` object

### Backend Validation
- ✅ Status must be "Unpaid" (validated in backend)
- ✅ Vendor must belong to same tenant
- ✅ All monetary values must be valid
- ✅ Items array must have at least one item
- ✅ Stock entries (if provided in create) must be unallocated

---

## Testing Considerations

### Manual Testing Checklist
- [ ] Edit button appears only for Unpaid invoices
- [ ] Edit button opens modal with populated form
- [ ] Modal title shows "Edit Purchase Invoice"
- [ ] All form fields populated with correct values
- [ ] Crate transaction enabled if exists in invoice
- [ ] Stock out entries section hidden in edit mode
- [ ] Submit button shows "Update Invoice"
- [ ] Update succeeds with valid data
- [ ] Success toast shows correct message
- [ ] Table refreshes with updated data
- [ ] Modal closes after successful update
- [ ] Error handling works for network errors
- [ ] Error handling works for validation errors
- [ ] Create button still works (create mode)
- [ ] Stock out entries visible in create mode
- [ ] Status validation works (can't edit paid invoices)

### Edge Cases
- [ ] Editing invoice with no crate transaction
- [ ] Editing invoice with null expense fields
- [ ] Editing invoice with optional fields (crates, boxes)
- [ ] Network failure during update
- [ ] Attempting to edit paid invoice (should fail)
- [ ] Switching between create and edit modes
- [ ] Closing modal without saving changes

---

## Comparison with Sales Invoice Edit

### Similarities
✅ State management pattern (editingInvoice state)
✅ Handler functions (handleEdit, handleCreateNew)
✅ Conditional Edit button in Actions column
✅ Modal prop passing pattern
✅ Form population useEffect
✅ Mutation detection logic (isEditMode)
✅ Dynamic toast messages
✅ Dynamic button text
✅ Error handling patterns

### Differences
❌ **Status Check**: Purchase uses `"Unpaid"`, Sales uses `"Pending"`
❌ **Stock Handling**: Purchase hides section, Sales doesn't have stock entries
❌ **API Endpoint**: Different URLs (`/purchase-invoices` vs `/sales-invoices`)
❌ **Expense Fields**: Purchase has more expense fields than Sales
❌ **Crate Party Type**: Purchase uses 'vendor', Sales uses 'retailer'

---

## Related Documentation
- [Sales Invoice Edit Implementation](./Comment1-SalesPayments-Implementation.md)
- [Purchase Invoice Backend API](./server/src/modules/purchase-invoices/README.md)
- [Implementation Progress Summary](./IMPLEMENTATION_PROGRESS_SUMMARY.md)

---

## Summary

### Files Modified
1. ✅ `client/src/pages/purchase-invoices.tsx`
   - Added editingInvoice state
   - Added handleCreateNew and handleEdit functions
   - Added Edit button in Actions column
   - Updated Create button to use handleCreateNew
   - Passed invoice prop to modal

2. ✅ `client/src/components/forms/purchase-invoice-modal.tsx`
   - Updated interface to accept optional invoice prop
   - Added form population useEffect
   - Updated mutation to handle both create and edit
   - Updated modal title dynamically
   - Hidden stock out entries in edit mode
   - Updated submit button text dynamically

### Lines of Code Changed
- **purchase-invoices.tsx**: ~50 lines added/modified
- **purchase-invoice-modal.tsx**: ~100 lines added/modified

### Testing Status
- ⏳ Manual testing pending
- ⏳ Integration testing pending
- ⏳ Edge case validation pending

---

**Implementation Date:** October 16, 2025  
**Status:** ✅ Complete - Ready for Testing  
**Pattern:** Follows Sales Invoice Edit implementation exactly
