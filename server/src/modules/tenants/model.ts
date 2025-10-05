import { eq, like, or, sql } from "drizzle-orm";
import { db } from "../../../db";
import { tenants, type Tenant, type InsertTenant, type PaginationOptions, type PaginatedResult } from "@shared/schema";
import { WhatsAppCreditModel } from '../whatsapp/credit-model.js';
import { 
  applySorting,
  applySearchFilter,
  normalizePaginationOptions,
  getCountWithSearch,
  buildPaginationMetadata
} from "../../utils/pagination";

export class TenantModel {
  /**
   * Get a single tenant by ID
   */
  static async getTenant(id: string): Promise<Tenant | null> {
    const result = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    return result[0] || null;
  }

  /**
   * Get a tenant by slug
   */
  static async getTenantBySlug(slug: string): Promise<Tenant | null> {
    const result = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
    return result[0] || null;
  }

  /**
   * Get tenant settings
   */
  static async getTenantSettings(tenantId: string): Promise<any> {
    const result = await db.select({ settings: tenants.settings }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    const settings = result[0]?.settings || {};
    
    // Defense-in-depth: Strip legacy WhatsApp credentials from reads to ensure clients never receive them
    if ((settings as any).whatsapp) {
      const { accountSid, authToken, phoneNumber, ...cleanWhatsApp } = (settings as any).whatsapp;
      (settings as any).whatsapp = cleanWhatsApp;
    }
    
    return settings;
  }

  /**
   * Deep merge two objects
   */
  private static deepMerge(target: any, source: any): any {
    if (source === null || source === undefined) return target;
    if (target === null || target === undefined) return source;
    
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(target[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }

  /**
   * Update tenant settings with deep merge
   */
  static async updateTenantSettings(tenantId: string, newSettings: any): Promise<Tenant | null> {
    // Get current settings
    const currentSettings = await this.getTenantSettings(tenantId);
    
    // Deep merge new settings with current settings
    const mergedSettings = this.deepMerge(currentSettings, newSettings);
    
    // Strip legacy WhatsApp credentials after merge to ensure they don't persist
    if (mergedSettings.whatsapp) {
      delete mergedSettings.whatsapp.accountSid;
      delete mergedSettings.whatsapp.authToken;
      delete mergedSettings.whatsapp.phoneNumber;
    }
    
    const result = await db.update(tenants).set({ settings: mergedSettings }).where(eq(tenants.id, tenantId)).returning();
    return result[0] || null;
  }

  /**
   * Get WhatsApp settings for a tenant, returning defaults when absent
   */
  static async getWhatsAppSettings(tenantId: string): Promise<any> {
    const settings = await this.getTenantSettings(tenantId);
    
    // Return defaults if WhatsApp settings don't exist
    const defaultWhatsAppSettings = {
      enabled: false,
      creditBalance: 0,
      lowCreditThreshold: 50,
      scheduler: {
        enabled: true,
        preferredSendHour: 9,
        reminderFrequency: 'daily',
        sendOnWeekends: true,
      },
      defaultTemplates: {
        paymentReminder: 'Dear {vendorName}, your payment of ₹{amount} for invoice {invoiceNumber} is due. Please clear the dues at the earliest.',
        invoiceNotification: 'Dear {vendorName}, invoice {invoiceNumber} for ₹{amount} has been generated. Please review and confirm.',
        welcomeMessage: 'Welcome! We are pleased to work with you.'
      }
    };

    const whatsappSettings = (settings as any).whatsapp || defaultWhatsAppSettings;
    
    // Additional defense: Ensure legacy credentials are never returned even if they somehow exist
    const { accountSid, authToken, phoneNumber, ...cleanWhatsAppSettings } = whatsappSettings;
    
    return cleanWhatsAppSettings;
  }

  /**
   * Update WhatsApp settings, merging into existing settings JSON
   */
  static async updateWhatsAppSettings(tenantId: string, partialSettings: any): Promise<Tenant | null> {
    const currentSettings = await this.getTenantSettings(tenantId);
    const currentWhatsAppSettings = await this.getWhatsAppSettings(tenantId);
    
    // Merge the partial settings into current WhatsApp settings
    const updatedWhatsAppSettings = {
      ...currentWhatsAppSettings,
      ...partialSettings
    };

    // Merge into the overall tenant settings
    const updatedSettings = {
      ...currentSettings,
      whatsapp: updatedWhatsAppSettings
    };

    return await this.updateTenantSettings(tenantId, updatedSettings);
  }

  /**
   * Get credit balance for a tenant
   */
  static async getCreditBalance(tenantId: string): Promise<number> {
    const creditModel = new WhatsAppCreditModel();
    return await creditModel.getCreditBalance(tenantId);
  }

  /**
   * Check if tenant has sufficient credits
   */
  static async checkCreditAvailability(tenantId: string, creditsRequired: number = 1): Promise<any> {
    const creditModel = new WhatsAppCreditModel();
    return await creditModel.checkCreditAvailability(tenantId, creditsRequired);
  }

  /**
   * Deduct WhatsApp credits for a tenant
   */
  static async deductWhatsAppCredits(tenantId: string, amount: number, referenceType: string, referenceId: string, notes?: string): Promise<any> {
    const creditModel = new WhatsAppCreditModel();
    return await creditModel.deductCredits(tenantId, amount, referenceType, referenceId, notes);
  }
}