import { eq, asc, and } from "drizzle-orm";
import { 
  vendors,
  type Vendor, 
  type InsertVendor,
  type PaginationOptions,
  type PaginatedResult
} from "@shared/schema";
import { db } from "../../../db";
import {
  normalizePaginationOptions,
  applySorting,
  applySearchFilter,
  getCountWithSearch,
  buildPaginationMetadata,
  withTenantPagination
} from "../../utils/pagination";
import { withTenant, ensureTenantInsert } from "../../utils/tenant-scope";

export class VendorModel {
  async getVendors(tenantId: string): Promise<Vendor[]> {
    return await db.select().from(vendors)
      .where(withTenant(vendors, tenantId, eq(vendors.isActive, true)))
      .orderBy(asc(vendors.name));
  }

  async getVendor(tenantId: string, id: string): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors)
      .where(withTenant(vendors, tenantId, eq(vendors.id, id)));
    return vendor || undefined;
  }

  async createVendor(tenantId: string, insertVendor: InsertVendor): Promise<Vendor> {
    const vendorWithTenant = ensureTenantInsert(insertVendor, tenantId);
    const [vendor] = await db.insert(vendors).values(vendorWithTenant).returning();
    return vendor;
  }

  async updateVendor(tenantId: string, id: string, insertVendor: Partial<InsertVendor>): Promise<Vendor | undefined> {
    const [vendor] = await db
      .update(vendors)
      .set(insertVendor)
      .where(withTenant(vendors, tenantId, eq(vendors.id, id)))
      .returning();
    return vendor || undefined;
  }

  async deleteVendor(tenantId: string, id: string): Promise<boolean> {
    const [vendor] = await db
      .update(vendors)
      .set({ isActive: false })
      .where(withTenant(vendors, tenantId, eq(vendors.id, id)))
      .returning();
    return !!vendor;
  }

  async getVendorsPaginated(tenantId: string, options: PaginationOptions): Promise<PaginatedResult<Vendor>> {
    const { page, limit, offset, tenantCondition } = withTenantPagination(vendors, tenantId, options);
    
    // Define table columns for sorting and searching
    const tableColumns = {
      name: vendors.name,
      contactPerson: vendors.contactPerson,
      createdAt: vendors.createdAt
    };
    
    const searchableColumns = [vendors.name, vendors.contactPerson];
    
    // Combine tenant filtering with existing isActive filtering
    const combinedCondition = and(tenantCondition, eq(vendors.isActive, true))!;
    
    // Build base query with tenant and isActive filters
    let query = db.select().from(vendors).where(combinedCondition);
    
    // Apply search filter using helper
    if (options.search) {
      query = applySearchFilter(query, options.search, searchableColumns, combinedCondition);
    }
    
    // Apply sorting using helper
    query = applySorting(query, options.sortBy || 'name', options.sortOrder || 'asc', tableColumns);
    
    // Apply pagination and execute
    const data = await query.limit(limit).offset(offset);
    
    // Get total count with tenant and isActive filtering
    const total = await getCountWithSearch(
      vendors, 
      options.search ? searchableColumns : undefined, 
      options.search,
      combinedCondition
    );
    
    const pagination = buildPaginationMetadata(page, limit, total);
    
    return { data, pagination };
  }
}