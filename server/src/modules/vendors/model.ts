import { eq, asc, and, inArray, count, sum } from "drizzle-orm";
import { 
  vendors,
  purchaseInvoices,
  invoiceItems,
  payments,
  stockMovements,
  whatsappMessages,
  items,
  salesInvoiceItems,
  stock,
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
    return await db.transaction(async (tx) => {
      // a. Delete whatsappMessages where recipientType='vendor' and recipientId=id
      await tx.delete(whatsappMessages)
        .where(and(
          withTenant(whatsappMessages, tenantId),
          eq(whatsappMessages.recipientType, 'vendor'),
          eq(whatsappMessages.recipientId, id)
        ));

      // b. Delete payments where vendorId=id
      await tx.delete(payments)
        .where(and(
          withTenant(payments, tenantId),
          eq(payments.vendorId, id)
        ));

      // c. Delete invoiceItems - first get all purchaseInvoices IDs for this vendor
      const vendorInvoices = await tx.select({ id: purchaseInvoices.id })
        .from(purchaseInvoices)
        .where(and(
          withTenant(purchaseInvoices, tenantId),
          eq(purchaseInvoices.vendorId, id)
        ));

      const invoiceIds = vendorInvoices.map(invoice => invoice.id);
      
      if (invoiceIds.length > 0) {
        await tx.delete(invoiceItems)
          .where(and(
            withTenant(invoiceItems, tenantId),
            inArray(invoiceItems.invoiceId, invoiceIds)
          ));
      }

      // d. Delete purchaseInvoices where vendorId=id
      await tx.delete(purchaseInvoices)
        .where(and(
          withTenant(purchaseInvoices, tenantId),
          eq(purchaseInvoices.vendorId, id)
        ));

      // e. Get all items that belong to this vendor before deleting dependent records
      const vendorItems = await tx.select({ id: items.id })
        .from(items)
        .where(and(
          withTenant(items, tenantId),
          eq(items.vendorId, id)
        ));

      const itemIds = vendorItems.map(item => item.id);
      
      if (itemIds.length > 0) {
        // Delete salesInvoiceItems that reference these items
        await tx.delete(salesInvoiceItems)
          .where(and(
            withTenant(salesInvoiceItems, tenantId),
            inArray(salesInvoiceItems.itemId, itemIds)
          ));

        // Delete stock records that reference these items
        await tx.delete(stock)
          .where(and(
            withTenant(stock, tenantId),
            inArray(stock.itemId, itemIds)
          ));

        // Delete stockMovements that reference these items
        await tx.delete(stockMovements)
          .where(and(
            withTenant(stockMovements, tenantId),
            inArray(stockMovements.itemId, itemIds)
          ));
      }

      // f. Delete stockMovements where vendorId=id (vendorId is nullable)
      await tx.delete(stockMovements)
        .where(and(
          withTenant(stockMovements, tenantId),
          eq(stockMovements.vendorId, id)
        ));

      // g. Delete items where vendorId=id
      await tx.delete(items)
        .where(and(
          withTenant(items, tenantId),
          eq(items.vendorId, id)
        ));

      // h. Finally delete the vendor record itself
      const [deletedVendor] = await tx.delete(vendors)
        .where(and(
          withTenant(vendors, tenantId),
          eq(vendors.id, id)
        ))
        .returning();

      return !!deletedVendor;
    });
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
    
    // Build WHERE conditions array starting with tenant filtering
    const whereConditions = [tenantCondition];
    
    // Filter by active vendors by default unless status is 'all'
    if (options.status !== 'all') {
      const isActive = options.status === 'inactive' ? false : true;
      whereConditions.push(eq(vendors.isActive, isActive));
    }
    
    // Combine all conditions
    const combinedCondition = and(...whereConditions)!;
    
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

  async getVendorStats(tenantId: string): Promise<{ totalVendors: number; totalBalance: string; totalCrates: number }> {
    const [result] = await db.select({
      totalVendors: count(),
      totalBalance: sum(vendors.balance),
      totalCrates: sum(vendors.crateBalance)
    })
    .from(vendors)
    .where(withTenant(vendors, tenantId, eq(vendors.isActive, true)));

    return {
      totalVendors: result.totalVendors,
      totalBalance: result.totalBalance || '0.00',
      totalCrates: Number(result.totalCrates) || 0
    };
  }
}