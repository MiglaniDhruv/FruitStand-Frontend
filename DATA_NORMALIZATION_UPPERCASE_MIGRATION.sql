# Data Normalization Script for Uppercase Text Fields

## Overview
This script provides SQL statements to normalize existing data to uppercase for consistency with the new schema transformations.

## Execution Date
To be executed: After deploying the uppercase transformation changes

---

## Affected Tables and Columns

### 1. Users Table
```sql
-- Normalize user data to uppercase
UPDATE users 
SET 
  username = UPPER(username),
  role = UPPER(role),
  name = UPPER(name)
WHERE 
  username != UPPER(username) 
  OR role != UPPER(role) 
  OR name != UPPER(name);

-- Verify the update
SELECT COUNT(*) as affected_users
FROM users
WHERE username != UPPER(username) 
   OR role != UPPER(role) 
   OR name != UPPER(name);
-- Should return 0 after successful update
```

### 2. Tenants Table
```sql
-- Normalize tenant data to uppercase
UPDATE tenants 
SET 
  name = UPPER(name),
  slug = UPPER(slug)
WHERE 
  name != UPPER(name) 
  OR slug != UPPER(slug);

-- Verify the update
SELECT COUNT(*) as affected_tenants
FROM tenants
WHERE name != UPPER(name) 
   OR slug != UPPER(slug);
-- Should return 0 after successful update
```

### 3. Vendors Table
```sql
-- Normalize vendor data to uppercase
UPDATE vendors 
SET 
  name = UPPER(name),
  address = UPPER(address)
WHERE 
  name != UPPER(name) 
  OR (address IS NOT NULL AND address != UPPER(address));

-- Verify the update
SELECT COUNT(*) as affected_vendors
FROM vendors
WHERE name != UPPER(name) 
   OR (address IS NOT NULL AND address != UPPER(address));
-- Should return 0 after successful update
```

### 4. Items Table
```sql
-- Normalize item data to uppercase
UPDATE items 
SET 
  name = UPPER(name),
  quality = UPPER(quality),
  unit = UPPER(unit)
WHERE 
  name != UPPER(name) 
  OR quality != UPPER(quality) 
  OR unit != UPPER(unit);

-- Verify the update
SELECT COUNT(*) as affected_items
FROM items
WHERE name != UPPER(name) 
   OR quality != UPPER(quality) 
   OR unit != UPPER(unit);
-- Should return 0 after successful update
```

### 5. Bank Accounts Table
```sql
-- Normalize bank account data to uppercase
UPDATE bank_accounts 
SET 
  name = UPPER(name),
  account_number = UPPER(account_number),
  bank_name = UPPER(bank_name),
  ifsc_code = UPPER(ifsc_code)
WHERE 
  name != UPPER(name) 
  OR account_number != UPPER(account_number) 
  OR bank_name != UPPER(bank_name) 
  OR (ifsc_code IS NOT NULL AND ifsc_code != UPPER(ifsc_code));

-- Verify the update
SELECT COUNT(*) as affected_bank_accounts
FROM bank_accounts
WHERE name != UPPER(name) 
   OR account_number != UPPER(account_number) 
   OR bank_name != UPPER(bank_name) 
   OR (ifsc_code IS NOT NULL AND ifsc_code != UPPER(ifsc_code));
-- Should return 0 after successful update
```

### 6. Retailers Table
```sql
-- Normalize retailer data to uppercase
UPDATE retailers 
SET 
  name = UPPER(name),
  address = UPPER(address)
WHERE 
  name != UPPER(name) 
  OR (address IS NOT NULL AND address != UPPER(address));

-- Verify the update
SELECT COUNT(*) as affected_retailers
FROM retailers
WHERE name != UPPER(name) 
   OR (address IS NOT NULL AND address != UPPER(address));
-- Should return 0 after successful update
```

---

## Pre-Migration Verification

### Check Affected Records Count
```sql
-- Count records that will be affected by each table
SELECT 
  'users' as table_name,
  COUNT(*) as records_to_update
FROM users
WHERE username != UPPER(username) 
   OR role != UPPER(role) 
   OR name != UPPER(name)

UNION ALL

SELECT 
  'tenants' as table_name,
  COUNT(*) as records_to_update
FROM tenants
WHERE name != UPPER(name) 
   OR slug != UPPER(slug)

UNION ALL

SELECT 
  'vendors' as table_name,
  COUNT(*) as records_to_update
FROM vendors
WHERE name != UPPER(name) 
   OR (address IS NOT NULL AND address != UPPER(address))

UNION ALL

SELECT 
  'items' as table_name,
  COUNT(*) as records_to_update
FROM items
WHERE name != UPPER(name) 
   OR quality != UPPER(quality) 
   OR unit != UPPER(unit)

UNION ALL

SELECT 
  'bank_accounts' as table_name,
  COUNT(*) as records_to_update
FROM bank_accounts
WHERE name != UPPER(name) 
   OR account_number != UPPER(account_number) 
   OR bank_name != UPPER(bank_name) 
   OR (ifsc_code IS NOT NULL AND ifsc_code != UPPER(ifsc_code))

UNION ALL

SELECT 
  'retailers' as table_name,
  COUNT(*) as records_to_update
FROM retailers
WHERE name != UPPER(name) 
   OR (address IS NOT NULL AND address != UPPER(address));
```

---

## Unique Constraint Considerations

### Check for Potential Conflicts
Before running the migration, check if uppercase transformation will cause unique constraint violations:

```sql
-- Check for potential duplicate users after uppercase transformation
SELECT 
  tenant_id,
  UPPER(username) as normalized_username,
  COUNT(*) as duplicate_count
FROM users
GROUP BY tenant_id, UPPER(username)
HAVING COUNT(*) > 1;

-- Check for potential duplicate tenants after uppercase transformation
SELECT 
  UPPER(slug) as normalized_slug,
  COUNT(*) as duplicate_count
FROM tenants
GROUP BY UPPER(slug)
HAVING COUNT(*) > 1;

-- Check for potential duplicate vendors after uppercase transformation
SELECT 
  tenant_id,
  UPPER(name) as normalized_name,
  COUNT(*) as duplicate_count
FROM vendors
GROUP BY tenant_id, UPPER(name)
HAVING COUNT(*) > 1;

-- Check for potential duplicate items after uppercase transformation
SELECT 
  tenant_id,
  UPPER(name) as normalized_name,
  UPPER(quality) as normalized_quality,
  UPPER(unit) as normalized_unit,
  COUNT(*) as duplicate_count
FROM items
GROUP BY tenant_id, UPPER(name), UPPER(quality), UPPER(unit)
HAVING COUNT(*) > 1;

-- Check for potential duplicate bank accounts after uppercase transformation
SELECT 
  tenant_id,
  UPPER(account_number) as normalized_account_number,
  COUNT(*) as duplicate_count
FROM bank_accounts
GROUP BY tenant_id, UPPER(account_number)
HAVING COUNT(*) > 1;

-- Check for potential duplicate retailers after uppercase transformation
SELECT 
  tenant_id,
  UPPER(name) as normalized_name,
  COUNT(*) as duplicate_count
FROM retailers
GROUP BY tenant_id, UPPER(name)
HAVING COUNT(*) > 1;
```

### Handling Duplicates
If duplicates are found, they must be resolved before migration:

1. **Manual Resolution**: Review each duplicate and merge or delete as appropriate
2. **Automated Resolution**: Add suffix to duplicate entries
3. **Data Cleanup**: Remove invalid/test data

---

## Backup Strategy

### Before Migration
```sql
-- Create backup tables
CREATE TABLE users_backup AS SELECT * FROM users;
CREATE TABLE tenants_backup AS SELECT * FROM tenants;
CREATE TABLE vendors_backup AS SELECT * FROM vendors;
CREATE TABLE items_backup AS SELECT * FROM items;
CREATE TABLE bank_accounts_backup AS SELECT * FROM bank_accounts;
CREATE TABLE retailers_backup AS SELECT * FROM retailers;

-- Verify backups
SELECT 
  'users' as table_name,
  (SELECT COUNT(*) FROM users) as original_count,
  (SELECT COUNT(*) FROM users_backup) as backup_count;
-- Repeat for other tables
```

### Rollback Plan
```sql
-- If migration fails, restore from backup
BEGIN;

UPDATE users SET username = b.username, role = b.role, name = b.name
FROM users_backup b WHERE users.id = b.id;

UPDATE tenants SET name = b.name, slug = b.slug
FROM tenants_backup b WHERE tenants.id = b.id;

UPDATE vendors SET name = b.name, address = b.address
FROM vendors_backup b WHERE vendors.id = b.id;

UPDATE items SET name = b.name, quality = b.quality, unit = b.unit
FROM items_backup b WHERE items.id = b.id;

UPDATE bank_accounts SET name = b.name, account_number = b.account_number, 
  bank_name = b.bank_name, ifsc_code = b.ifsc_code
FROM bank_accounts_backup b WHERE bank_accounts.id = b.id;

UPDATE retailers SET name = b.name, address = b.address
FROM retailers_backup b WHERE retailers.id = b.id;

COMMIT;
```

---

## Execution Plan

### Step 1: Pre-Migration Checks
1. Run pre-migration verification queries
2. Check for potential unique constraint conflicts
3. Create database backup

### Step 2: Execute Migration
1. Start transaction
2. Run normalization updates for each table
3. Verify each update before proceeding
4. Commit transaction

### Step 3: Post-Migration Verification
1. Run verification queries (should return 0 for all)
2. Test application functionality
3. Monitor for any case-sensitivity issues

### Step 4: Cleanup
1. Drop backup tables after successful verification (optional, keep for 1 week)
2. Monitor application logs for any issues

---

## Complete Migration Script

```sql
-- COMPLETE UPPERCASE NORMALIZATION MIGRATION
-- Execute this script in a transaction for safety

BEGIN;

-- 1. Create backups
CREATE TABLE users_backup AS SELECT * FROM users;
CREATE TABLE tenants_backup AS SELECT * FROM tenants;
CREATE TABLE vendors_backup AS SELECT * FROM vendors;
CREATE TABLE items_backup AS SELECT * FROM items;
CREATE TABLE bank_accounts_backup AS SELECT * FROM bank_accounts;
CREATE TABLE retailers_backup AS SELECT * FROM retailers;

-- 2. Normalize users
UPDATE users 
SET 
  username = UPPER(username),
  role = UPPER(role),
  name = UPPER(name)
WHERE 
  username != UPPER(username) 
  OR role != UPPER(role) 
  OR name != UPPER(name);

-- 3. Normalize tenants
UPDATE tenants 
SET 
  name = UPPER(name),
  slug = UPPER(slug)
WHERE 
  name != UPPER(name) 
  OR slug != UPPER(slug);

-- 4. Normalize vendors
UPDATE vendors 
SET 
  name = UPPER(name),
  address = UPPER(address)
WHERE 
  name != UPPER(name) 
  OR (address IS NOT NULL AND address != UPPER(address));

-- 5. Normalize items
UPDATE items 
SET 
  name = UPPER(name),
  quality = UPPER(quality),
  unit = UPPER(unit)
WHERE 
  name != UPPER(name) 
  OR quality != UPPER(quality) 
  OR unit != UPPER(unit);

-- 6. Normalize bank accounts
UPDATE bank_accounts 
SET 
  name = UPPER(name),
  account_number = UPPER(account_number),
  bank_name = UPPER(bank_name),
  ifsc_code = UPPER(ifsc_code)
WHERE 
  name != UPPER(name) 
  OR account_number != UPPER(account_number) 
  OR bank_name != UPPER(bank_name) 
  OR (ifsc_code IS NOT NULL AND ifsc_code != UPPER(ifsc_code));

-- 7. Normalize retailers
UPDATE retailers 
SET 
  name = UPPER(name),
  address = UPPER(address)
WHERE 
  name != UPPER(name) 
  OR (address IS NOT NULL AND address != UPPER(address));

-- 8. Verify all updates
DO $$
DECLARE
  users_remaining INT;
  tenants_remaining INT;
  vendors_remaining INT;
  items_remaining INT;
  bank_accounts_remaining INT;
  retailers_remaining INT;
BEGIN
  SELECT COUNT(*) INTO users_remaining FROM users
  WHERE username != UPPER(username) OR role != UPPER(role) OR name != UPPER(name);
  
  SELECT COUNT(*) INTO tenants_remaining FROM tenants
  WHERE name != UPPER(name) OR slug != UPPER(slug);
  
  SELECT COUNT(*) INTO vendors_remaining FROM vendors
  WHERE name != UPPER(name) OR (address IS NOT NULL AND address != UPPER(address));
  
  SELECT COUNT(*) INTO items_remaining FROM items
  WHERE name != UPPER(name) OR quality != UPPER(quality) OR unit != UPPER(unit);
  
  SELECT COUNT(*) INTO bank_accounts_remaining FROM bank_accounts
  WHERE name != UPPER(name) OR account_number != UPPER(account_number) 
     OR bank_name != UPPER(bank_name) OR (ifsc_code IS NOT NULL AND ifsc_code != UPPER(ifsc_code));
  
  SELECT COUNT(*) INTO retailers_remaining FROM retailers
  WHERE name != UPPER(name) OR (address IS NOT NULL AND address != UPPER(address));
  
  IF users_remaining > 0 OR tenants_remaining > 0 OR vendors_remaining > 0 
     OR items_remaining > 0 OR bank_accounts_remaining > 0 OR retailers_remaining > 0 THEN
    RAISE EXCEPTION 'Verification failed: Some records not normalized';
  ELSE
    RAISE NOTICE 'All records successfully normalized to uppercase';
  END IF;
END $$;

-- If verification passes, commit the transaction
COMMIT;

-- If you want to rollback instead, run: ROLLBACK;
```

---

## Post-Migration Application Updates

### Update Search/Filter Logic
Ensure all search and filter operations are case-insensitive:

```typescript
// Use ILIKE instead of LIKE for PostgreSQL
.where(ilike(users.username, `%${searchTerm}%`))
.where(ilike(vendors.name, `%${searchTerm}%`))
.where(ilike(items.name, `%${searchTerm}%`))
```

### Update Login Logic
Ensure username comparison is case-insensitive:

```typescript
// Transform input to uppercase before comparison
const user = await db.select()
  .from(users)
  .where(and(
    eq(users.tenantId, tenantId),
    eq(users.username, username.toUpperCase())
  ))
  .limit(1);
```

---

## Monitoring and Validation

### Post-Migration Checks (Week 1)
1. Monitor application logs for case-sensitivity errors
2. Check user reports for search/filter issues
3. Verify unique constraints are working correctly
4. Test all CRUD operations for each affected entity

### Metrics to Track
- Number of records updated per table
- Any unique constraint violations
- Search/filter performance changes
- User-reported issues

---

**Prepared By**: Development Team  
**Execution Window**: To be scheduled during low-traffic period  
**Estimated Duration**: 5-15 minutes (depends on data volume)  
**Rollback Time**: < 5 minutes  
**Status**: Ready for execution after code deployment
