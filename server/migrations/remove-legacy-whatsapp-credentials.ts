import { db } from '../db';
import { tenants } from '../../shared/schema';
import { eq, isNotNull } from 'drizzle-orm';

/**
 * Migration to remove legacy WhatsApp credentials from tenant settings
 * These credentials are now managed globally via environment variables
 * 
 * Optional SQL snippet for direct PostgreSQL execution:
 * UPDATE tenants SET settings = jsonb_set(settings, '{whatsapp}', coalesce((settings->'whatsapp') - 'accountSid' - 'authToken' - 'phoneNumber', '{}'::jsonb), true) WHERE settings ? 'whatsapp';
 */
export async function removeLegacyWhatsAppCredentials() {
  console.log('🧹 Starting migration: Remove legacy WhatsApp credentials from tenant settings...');
  
  try {
    // Get all tenants with settings
    const tenantsWithSettings = await db
      .select()
      .from(tenants)
      .where(isNotNull(tenants.settings));

    let updatedCount = 0;
    
    for (const tenant of tenantsWithSettings) {
      let settings = tenant.settings as any;
      let needsUpdate = false;

      // Check if whatsapp settings exist and contain legacy credentials
      if (settings?.whatsapp) {
        const legacyKeys = ['accountSid', 'authToken', 'phoneNumber'];
        
        for (const key of legacyKeys) {
          if (key in settings.whatsapp) {
            delete settings.whatsapp[key];
            needsUpdate = true;
          }
        }
      }

      // Update tenant if legacy credentials were found and removed
      if (needsUpdate) {
        await db
          .update(tenants)
          .set({ settings })
          .where(eq(tenants.id, tenant.id));
        
        updatedCount++;
        console.log(`✅ Cleaned legacy credentials from tenant: ${tenant.name} (${tenant.slug})`);
      }
    }

    console.log(`🎉 Migration completed successfully! Updated ${updatedCount} tenant(s).`);
    return { success: true, updatedCount };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if this script is executed directly
if (import.meta.url.endsWith(process.argv[1])) {
  removeLegacyWhatsAppCredentials()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal migration error:', error);
      process.exit(1);
    });
}