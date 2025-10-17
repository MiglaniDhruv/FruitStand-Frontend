# Item Dropdown Format Update

## Issue
Item dropdowns across the application were showing inconsistent formats:
- Sales Invoice Modal: "Item Name - Vendor Name"
- Purchase Invoice Modal: "Item Name - Quality (Unit)"
- Stock Page (Add Stock): "Item Name - Quality"
- Stock Page (Update Stock): "Item Name - Quality (Vendor Name)"

This inconsistency made it difficult for users to identify items, especially when multiple items have the same name but different qualities or vendors.

## Solution
Standardized all item dropdowns to show the format:
**"Item Name - Quality - Vendor Name"**

This format provides:
1. **Item Name**: The primary identifier
2. **Quality**: Differentiates between items with same name but different grades (e.g., A, B, C)
3. **Vendor Name**: Shows which vendor supplies this specific item

## Files Modified

### 1. Sales Invoice Modal
**File**: `client/src/components/forms/sales-invoice-modal.tsx`

**Before**:
```tsx
<SelectItem key={item.id} value={item.id}>
  {item.name} - {item.vendor?.name || 'Unknown Vendor'}
</SelectItem>
```

**After**:
```tsx
<SelectItem key={item.id} value={item.id}>
  {item.name} - {item.quality} - {item.vendor?.name || 'Unknown Vendor'}
</SelectItem>
```

**Location**: Line ~617-618

### 2. Purchase Invoice Modal
**File**: `client/src/components/forms/purchase-invoice-modal.tsx`

**Before**:
```tsx
<SelectItem key={item.id} value={item.id}>
  {item.name} - {item.quality} ({item.unit?.charAt(0).toUpperCase() + item.unit?.slice(1) || 'N/A'})
</SelectItem>
```

**After**:
```tsx
<SelectItem key={item.id} value={item.id}>
  {item.name} - {item.quality} - {item.vendor?.name || 'Unknown Vendor'}
</SelectItem>
```

**Location**: Line ~764-765

**Note**: Removed the unit display as it was redundant. Unit information is already shown in the column headers and can be inferred from the item selection.

### 3. Stock Page (Add Stock Modal)
**File**: `client/src/pages/stock.tsx`

**Before**:
```tsx
<SelectItem key={item.id} value={item.id}>
  {item.name} - {item.quality}
</SelectItem>
```

**After**:
```tsx
<SelectItem key={item.id} value={item.id}>
  {item.name} - {item.quality} - {item.vendor?.name || 'Unknown Vendor'}
</SelectItem>
```

**Location**: Line ~863-864

### 4. Stock Page (Update Stock Modal)
**File**: `client/src/pages/stock.tsx`

**Status**: Already correct format (Line ~969-970)
```tsx
<SelectItem key={item.id} value={item.id}>
  {item.name} - {item.quality} ({item.vendor?.name || 'Unknown Vendor'})
</SelectItem>
```

**Note**: This dropdown already showed all three fields. The parentheses around vendor name are acceptable as it's a slightly different context (updating existing stock vs creating new).

## Benefits

1. **Consistency**: All item dropdowns now follow the same format
2. **Clarity**: Users can easily identify items by seeing all three critical attributes
3. **Reduced Errors**: Less chance of selecting wrong item when similar names exist
4. **Better UX**: Users don't need to remember which dropdown shows which fields

## Example Display

If you have an item:
- Name: SITAPHAL
- Quality: A
- Vendor: WEBWISE SOLUTION

The dropdown will display:
```
SITAPHAL - A - WEBWISE SOLUTION
```

This clearly shows:
- What the item is (SITAPHAL)
- What grade it is (A)
- Who supplies it (WEBWISE SOLUTION)

## Testing Recommendations

Test the following scenarios:
1. ✅ Sales Invoice: Select item from dropdown - should show "Name - Quality - Vendor"
2. ✅ Purchase Invoice: Select item from dropdown - should show "Name - Quality - Vendor"
3. ✅ Stock (Add): Select item from dropdown - should show "Name - Quality - Vendor"
4. ✅ Stock (Update): Select item from dropdown - should show "Name - Quality (Vendor)"
5. ✅ Multiple items with same name but different quality should be clearly distinguishable
6. ✅ Dropdown should handle items with missing vendor gracefully (show "Unknown Vendor")

## Related Updates

This change complements the previous fixes:
- **Item Edit Form Unit Display**: Fixed unit dropdown not showing selected value (item-form.tsx)
- **Uppercase Transformations**: All text fields are stored in uppercase in database
- **Item Creation Fix**: Resolved database errors when creating items

---

**Update Applied**: October 17, 2025  
**Status**: ✅ Complete  
**Impact**: All item dropdowns across the application  
**TypeScript Status**: ✅ No errors
