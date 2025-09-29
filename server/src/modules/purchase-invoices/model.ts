import { eq, desc, asc, and, or, gte, lte, ilike, inArray, count } from 'drizzle-orm';
import { db } from '../../../db';
import { purchaseInvoices, invoiceItems, vendors, items, type PurchaseInvoice, type InsertPurchaseInvoice, type InsertInvoiceItem, type InvoiceWithItems, type PaginationOptions, type PaginatedResult } from '@shared/schema';
import { normalizePaginationOptions, buildPaginationMetadata, withTenantPagination } from '../../utils/pagination';
import { withTenant, ensureTenantInsert } from '../../utils/tenant-scope';
import { assertSameTenant } from '../../utils/tenant';

export class PurchaseInvoiceModel {
  async getPurchaseInvoices(tenantId: string): Promise<InvoiceWithItems[]> {
    const invoices = await db.select().from(purchaseInvoices)
      .where(withTenant(purchaseInvoices, tenantId))
      .orderBy(desc(purchaseInvoices.createdAt));

    if (invoices.length === 0) {
      return [];
    }

    // Batch fetch vendors and items for all invoices with tenant filtering
    const vendorIdsSet = new Set(invoices.map(inv => inv.vendorId));
    const vendorIds = Array.from(vendorIdsSet);
    const invoiceIds = invoices.map(inv => inv.id);
    
    const [vendorsData, itemsData] = await Promise.all([
      vendorIds.length > 0 ? db.select().from(vendors).where(withTenant(vendors, tenantId, inArray(vendors.id, vendorIds))) : [],
      invoiceIds.length > 0 ? db.select().from(invoiceItems).where(withTenant(invoiceItems, tenantId, inArray(invoiceItems.invoiceId, invoiceIds))) : []
    ]);
    
    // Create lookup maps
    const vendorMap = new Map(vendorsData.map(v => [v.id, v]));
    const itemsMap = new Map<string, any[]>();
    itemsData.forEach(item => {
      if (!itemsMap.has(item.invoiceId)) {
        itemsMap.set(item.invoiceId, []);
      }
      itemsMap.get(item.invoiceId)!.push(item);
    });
    
    // Assemble final data - filter out invoices without vendors to maintain type integrity
    const result = invoices
      .map(invoice => {
        const vendor = vendorMap.get(invoice.vendorId);
        if (!vendor) return null;
        return {
          ...invoice,
          vendor,
          items: itemsMap.get(invoice.id) || []
        };
      })
      .filter(invoice => invoice !== null) as InvoiceWithItems[];

    return result;
  }

  async getPurchaseInvoice(tenantId: string, id: string): Promise<InvoiceWithItems | undefined> {
    const [invoice] = await db.select().from(purchaseInvoices)
      .where(withTenant(purchaseInvoices, tenantId, eq(purchaseInvoices.id, id)));

    if (!invoice) {
      return undefined;
    }

    const [vendor] = await db.select().from(vendors)
      .where(withTenant(vendors, tenantId, eq(vendors.id, invoice.vendorId)));
    
    if (!vendor) {
      throw new Error('Invoice vendor not found');
    }
    
    const itemsList = await db.select().from(invoiceItems)
      .where(withTenant(invoiceItems, tenantId, eq(invoiceItems.invoiceId, invoice.id)));

    return { ...invoice, vendor, items: itemsList };
  }

  async createPurchaseInvoice(tenantId: string, invoiceData: InsertPurchaseInvoice, itemsData: InsertInvoiceItem[]): Promise<InvoiceWithItems> {
    return await db.transaction(async (tx) => {
      // Validate tenant references
      await assertSameTenant(tx, tenantId, [
        { table: 'vendors', id: invoiceData.vendorId }
      ]);
      
      // Generate invoice number with PI prefix + compact timestamp suffix
      const invoiceNumber = `PI${String(Date.now()).slice(-6)}`;
      
      const invoiceWithTenant = ensureTenantInsert({
        ...invoiceData,
        invoiceNumber,
        balanceAmount: invoiceData.netAmount,
        status: 'Unpaid'
      }, tenantId);
      
      const [invoice] = await tx.insert(purchaseInvoices).values(invoiceWithTenant).returning();
      
      const itemsWithInvoiceIdAndTenant = itemsData.map(item => 
        ensureTenantInsert({
          ...item,
          invoiceId: invoice.id
        }, tenantId)
      );
      
      const createdItems = await tx.insert(invoiceItems).values(itemsWithInvoiceIdAndTenant).returning();
      
      const [vendor] = await tx.select().from(vendors)
        .where(withTenant(vendors, tenantId, eq(vendors.id, invoice.vendorId)));
      
      if (!vendor) {
        throw new Error('Invoice vendor not found');
      }
      
      return { ...invoice, vendor, items: createdItems };
    });
  }

  async getPurchaseInvoicesPaginated(tenantId: string, options?: PaginationOptions & {
    search?: string;
    status?: 'paid' | 'unpaid';
    vendorId?: string;
    dateRange?: { from?: string; to?: string };
  }): Promise<PaginatedResult<InvoiceWithItems>> {
    const { page, limit, offset, tenantCondition } = withTenantPagination(purchaseInvoices, tenantId, options || {});
    
    // Build WHERE conditions array starting with tenant filtering
    const whereConditions = [tenantCondition];
    
    // Apply status filter
    if (options?.status === 'paid') {
      whereConditions.push(eq(purchaseInvoices.status, 'Paid'));
    } else if (options?.status === 'unpaid') {
      whereConditions.push(or(
        eq(purchaseInvoices.status, 'Unpaid'),
        eq(purchaseInvoices.status, 'Partially Paid')
      )!);
    }
    
    // Apply vendor filter
    if (options?.vendorId) {
      whereConditions.push(eq(purchaseInvoices.vendorId, options.vendorId));
    }
    
    // Apply date range filter
    if (options?.dateRange?.from) {
      whereConditions.push(gte(purchaseInvoices.invoiceDate, new Date(options.dateRange.from)));
    }
    if (options?.dateRange?.to) {
      whereConditions.push(lte(purchaseInvoices.invoiceDate, new Date(options.dateRange.to)));
    }
    
    // Handle search by getting matching vendor IDs or invoice numbers/status
    if (options?.search) {
      // Get vendor IDs that match search with tenant filtering
      const matchingVendors = await db.select({ id: vendors.id })
        .from(vendors)
        .where(withTenant(vendors, tenantId, ilike(vendors.name, `%${options.search}%`)));
      const vendorIds = matchingVendors.map(v => v.id);
      
      // Build search conditions
      const searchConditions = [];
      
      // Search in invoice number
      searchConditions.push(ilike(purchaseInvoices.invoiceNumber, `%${options.search}%`));
      
      // Search in status
      searchConditions.push(ilike(purchaseInvoices.status, `%${options.search}%`));
      
      // Search in matching vendor IDs
      if (vendorIds.length > 0) {
        searchConditions.push(inArray(purchaseInvoices.vendorId, vendorIds));
      }
      
      if (searchConditions.length > 0) {
        whereConditions.push(or(...searchConditions)!);
      }
    }
    
    // Combine all conditions
    const finalWhereCondition = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    
    // Apply sorting
    const sortBy = options?.sortBy || 'createdAt';
    const sortOrder = options?.sortOrder || 'desc';
    
    // Build sorting order
    let orderByClause;
    if (sortBy === 'invoiceDate') {
      orderByClause = sortOrder === 'asc' ? asc(purchaseInvoices.invoiceDate) : desc(purchaseInvoices.invoiceDate);
    } else if (sortBy === 'invoiceNumber') {
      orderByClause = sortOrder === 'asc' ? asc(purchaseInvoices.invoiceNumber) : desc(purchaseInvoices.invoiceNumber);
    } else if (sortBy === 'totalAmount') {
      orderByClause = sortOrder === 'asc' ? asc(purchaseInvoices.netAmount) : desc(purchaseInvoices.netAmount);
    } else if (sortBy === 'status') {
      orderByClause = sortOrder === 'asc' ? asc(purchaseInvoices.status) : desc(purchaseInvoices.status);
    } else { // default to createdAt
      orderByClause = sortOrder === 'asc' ? asc(purchaseInvoices.createdAt) : desc(purchaseInvoices.createdAt);
    }
    
    // Build and execute paginated query
    const invoicesData = await (
      finalWhereCondition
        ? db.select()
          .from(purchaseInvoices)
          .where(finalWhereCondition)
          .orderBy(orderByClause)
          .limit(limit)
          .offset(offset)
        : db.select()
          .from(purchaseInvoices)
          .orderBy(orderByClause)
          .limit(limit)
          .offset(offset)
    );
    
    // Batch fetch vendors and items for all invoices with tenant filtering
    const vendorIdsSet = new Set(invoicesData.map(inv => inv.vendorId));
    const vendorIds = Array.from(vendorIdsSet);
    const invoiceIds = invoicesData.map(inv => inv.id);
    
    const [vendorsData, itemsData] = await Promise.all([
      vendorIds.length > 0 ? db.select().from(vendors).where(withTenant(vendors, tenantId, inArray(vendors.id, vendorIds))) : [],
      invoiceIds.length > 0 ? db.select().from(invoiceItems).where(withTenant(invoiceItems, tenantId, inArray(invoiceItems.invoiceId, invoiceIds))) : []
    ]);
    
    // Create lookup maps
    const vendorMap = new Map(vendorsData.map(v => [v.id, v]));
    const itemsMap = new Map<string, any[]>();
    itemsData.forEach(item => {
      if (!itemsMap.has(item.invoiceId)) {
        itemsMap.set(item.invoiceId, []);
      }
      itemsMap.get(item.invoiceId)!.push(item);
    });
    
    // Assemble final data - filter out invoices without vendors to maintain type integrity
    const data = invoicesData
      .map(invoice => {
        const vendor = vendorMap.get(invoice.vendorId);
        if (!vendor) return null;
        return {
          ...invoice,
          vendor,
          items: itemsMap.get(invoice.id) || []
        };
      })
      .filter(invoice => invoice !== null) as InvoiceWithItems[];
    
    // Get total count with same conditions
    const [{ count: total }] = await (
      finalWhereCondition
        ? db.select({ count: count() })
          .from(purchaseInvoices)
          .where(finalWhereCondition)
        : db.select({ count: count() })
          .from(purchaseInvoices)
    );
    
    const pagination = buildPaginationMetadata(page, limit, total);
    
    return { data, pagination };
  }
}