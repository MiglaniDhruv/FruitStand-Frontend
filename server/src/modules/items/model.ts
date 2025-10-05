import { eq, asc, and, or, gt, count } from "drizzle-orm";
import { 
  items,
  vendors,
  stock,
  type Item, 
  type InsertItem,
  type ItemWithVendor,
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

export class ItemModel {
  async getItems(tenantId: string): Promise<ItemWithVendor[]> {
    const results = await db.select({ item: items, vendor: vendors }).from(items)
      .leftJoin(vendors, and(eq(items.vendorId, vendors.id), eq(vendors.tenantId, tenantId)))
      .where(withTenant(items, tenantId, eq(items.isActive, true)))
      .orderBy(asc(items.name));
    
    return results.map(record => ({
      ...record.item,
      vendor: record.vendor
    }));
  }

  async getItemsByVendor(tenantId: string, vendorId: string): Promise<Item[]> {
    return await db.select().from(items)
      .where(withTenant(items, tenantId, and(eq(items.vendorId, vendorId), eq(items.isActive, true))))
      .orderBy(asc(items.name));
  }

  async getItem(tenantId: string, id: string): Promise<Item | undefined> {
    const [item] = await db.select().from(items)
      .where(withTenant(items, tenantId, eq(items.id, id)));
    return item || undefined;
  }

  async createItem(tenantId: string, insertItem: InsertItem): Promise<Item> {
    return await db.transaction(async (tx) => {
      const itemWithTenant = ensureTenantInsert(insertItem, tenantId);
      const [item] = await tx.insert(items).values(itemWithTenant).returning();
      const stockWithTenant = ensureTenantInsert({ itemId: item.id }, tenantId);
      await tx.insert(stock).values(stockWithTenant);
      return item;
    });
  }

  async updateItem(tenantId: string, id: string, insertItem: Partial<InsertItem>): Promise<Item | undefined> {
    const [item] = await db
      .update(items)
      .set(insertItem)
      .where(withTenant(items, tenantId, eq(items.id, id)))
      .returning();
    return item || undefined;
  }

  async deleteItem(tenantId: string, id: string): Promise<{ success: boolean; error?: string }> {
    return await db.transaction(async (tx) => {
      // Check if item has any stock quantities > 0 inside transaction with tenant filtering
      const stockEntries = await tx.select().from(stock)
        .where(withTenant(stock, tenantId, eq(stock.itemId, id)));
      
      for (const stockEntry of stockEntries) {
        const hasStock = 
          parseFloat(stockEntry.quantityInCrates || "0") > 0 ||
          parseFloat(stockEntry.quantityInBoxes || "0") > 0 ||
          parseFloat(stockEntry.quantityInKgs || "0") > 0;
        
        if (hasStock) {
          return { 
            success: false, 
            error: "Cannot delete item with existing stock quantities. Please clear stock first." 
          };
        }
      }
      
      // Proceed with soft deletion if no stock exists with tenant filtering
      const [item] = await tx
        .update(items)
        .set({ isActive: false })
        .where(withTenant(items, tenantId, eq(items.id, id)))
        .returning();
      
      return { success: !!item };
    });
  }

  async getItemsPaginated(tenantId: string, options: PaginationOptions): Promise<PaginatedResult<ItemWithVendor>> {
    const { page, limit, offset, tenantCondition } = withTenantPagination(items, tenantId, options);
    
    // Define table columns for sorting and searching
    const tableColumns = {
      name: items.name,
      quality: items.quality,
      unit: items.unit,
      createdAt: items.createdAt
    };
    
    const searchableColumns = [items.name];
    
    // Combine tenant filtering with existing isActive filtering
    const combinedCondition = and(tenantCondition, eq(items.isActive, true))!;
    
    // Build base query with left join to vendors
    let query = db.select({ item: items, vendor: vendors }).from(items)
      .leftJoin(vendors, and(eq(items.vendorId, vendors.id), eq(vendors.tenantId, tenantId)))
      .where(combinedCondition);
    
    // Apply search filter using helper
    if (options.search) {
      query = applySearchFilter(query, options.search, searchableColumns, combinedCondition);
    }
    
    // Apply sorting using helper
    query = applySorting(query, options.sortBy || 'name', options.sortOrder || 'asc', tableColumns);
    
    // Apply pagination and execute
    const results = await query.limit(limit).offset(offset);
    
    // Map results to ItemWithVendor format
    const data = results.map(record => ({
      ...record.item,
      vendor: record.vendor
    })) as ItemWithVendor[];
    
    // Get total count with same joins and filtering
    let countQuery = db.select({ count: count() }).from(items)
      .leftJoin(vendors, and(eq(items.vendorId, vendors.id), eq(vendors.tenantId, tenantId)))
      .where(combinedCondition);
    
    if (options.search) {
      countQuery = applySearchFilter(countQuery, options.search, searchableColumns, combinedCondition);
    }
    
    const [{ count: total }] = await countQuery;
    
    const pagination = buildPaginationMetadata(page, limit, total);
    
    return { data, pagination };
  }
}