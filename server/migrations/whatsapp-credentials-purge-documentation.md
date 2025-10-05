# WhatsApp Legacy Credentials Purge Implementation

## Changes Made

### 1. Model Layer Defense (`server/src/modules/tenants/model.ts`)

#### Write Operations
- **`updateTenantSettings`**: After deep merge, explicitly delete `mergedSettings.whatsapp.accountSid`, `mergedSettings.whatsapp.authToken`, and `mergedSettings.whatsapp.phoneNumber` before persisting to database.

#### Read Operations  
- **`getTenantSettings`**: Strip legacy credentials from all reads using destructuring to ensure clients never receive them.
- **`getWhatsAppSettings`**: Additional defense layer that strips legacy credentials even if they somehow exist.

### 2. Controller Layer Defense (`server/src/modules/tenants/controller.ts`)
- **`updateSettings`**: Already strips legacy credentials from incoming payload before validation and merge.

### 3. Migration Script
- **`server/migrations/remove-legacy-whatsapp-credentials.ts`**: Updated with SQL snippet for direct PostgreSQL execution.

## SQL Migration (Optional Direct Database Update)

```sql
UPDATE tenants 
SET settings = jsonb_set(
  settings, 
  '{whatsapp}', 
  coalesce(
    (settings->'whatsapp') - 'accountSid' - 'authToken' - 'phoneNumber', 
    '{}'::jsonb
  ), 
  true
) 
WHERE settings ? 'whatsapp';
```

## Validation Steps

### Manual Verification Steps

1. **Test Legacy Data Persistence**:
   ```bash
   # 1. Insert test tenant with legacy credentials in DB
   # 2. Call updateSettings API
   # 3. Verify DB no longer contains legacy keys
   # 4. Verify API response doesn't include legacy keys
   ```

2. **Test Read Defense**:
   ```bash
   # 1. Manually insert legacy credentials directly in DB
   # 2. Call getSettings API  
   # 3. Verify response doesn't include legacy keys
   ```

3. **Test Deep Merge Behavior**:
   ```bash
   # 1. Create tenant with legacy credentials
   # 2. Update only scheduler settings
   # 3. Verify legacy credentials are purged despite partial update
   ```

### Unit Test Assertions (if tests exist)

```javascript
// Assert getSettings responses never include legacy keys
expect(response.whatsapp).not.toHaveProperty('accountSid');
expect(response.whatsapp).not.toHaveProperty('authToken'); 
expect(response.whatsapp).not.toHaveProperty('phoneNumber');

// Assert updateSettings purges legacy keys from DB
// (Test would need to check database state directly)
```

## Defense Layers Summary

1. **Input Sanitization**: Controller strips legacy keys from incoming requests
2. **Merge Sanitization**: Model strips legacy keys after deep merge before DB write  
3. **Read Sanitization**: Model strips legacy keys from all read operations
4. **Migration Support**: Optional SQL for bulk cleanup of existing data

This multi-layered approach ensures legacy WhatsApp credentials cannot persist in the database or be returned to clients, regardless of how they might be introduced.