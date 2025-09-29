import { eq, like, or, sql } from "drizzle-orm";
import { db } from "../../../db";
import { tenants, type Tenant, type InsertTenant, type PaginationOptions, type PaginatedResult } from "@shared/schema";
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
    return result[0]?.settings || {};
  }

  /**
   * Update tenant settings
   */
  static async updateTenantSettings(tenantId: string, settings: any): Promise<Tenant | null> {
    const result = await db.update(tenants).set({ settings }).where(eq(tenants.id, tenantId)).returning();
    return result[0] || null;
  }
}