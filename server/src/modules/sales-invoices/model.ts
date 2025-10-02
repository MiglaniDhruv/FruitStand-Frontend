import { eq, desc, asc, and, or, gte, lte, ilike, inArray, count } from 'drizzle-orm';
import { db } from '../../../db';
import { salesInvoices, salesInvoiceItems, retailers, salesPayments, type SalesInvoice, type InsertSalesInvoice, type InsertSalesInvoiceItem, type SalesInvoiceWithDetails, type PaginationOptions, type PaginatedResult, type Retailer, type InvoiceShareLink } from '@shared/schema';
import { normalizePaginationOptions, buildPaginationMetadata } from '../../utils/pagination';
import { withTenant, ensureTenantInsert } from '../../utils/tenant-scope';
import { InvoiceShareLinkModel } from '../invoice-share-links/model';

// Local type that allows null retailers for legacy compatibility
type SalesInvoiceWithNullableRetailer = SalesInvoice & {
  retailer: Retailer | null;
  items: any[];
  payments: any[];
};

export class SalesInvoiceModel {
  private shareModel = new InvoiceShareLinkModel();

  async createShareLink(tenantId: string, invoiceId: string): Promise<InvoiceShareLink> {
    // Verify the invoice exists and belongs to this tenant
    const invoice = await this.getSalesInvoice(tenantId, invoiceId);
    if (!invoice) {
      throw new Error('Sales invoice not found');
    }
    
    return await this.shareModel.createOrGetShareLink(tenantId, invoiceId, 'sales');
  }

  async getSalesInvoices(tenantId: string): Promise<SalesInvoiceWithDetails[]> {
    const invoices = await db.select().from(salesInvoices)
      .where(withTenant(salesInvoices, tenantId))
      .orderBy(desc(salesInvoices.createdAt));

    if (invoices.length === 0) {
      return [];
    }

    // Batch fetch retailers, items, and payments for all invoices with tenant filtering
    const retailerIdsSet = new Set(invoices.map(inv => inv.retailerId));
    const retailerIds = Array.from(retailerIdsSet);
    const invoiceIds = invoices.map(inv => inv.id);
    
    const [retailersData, itemsData, paymentsData] = await Promise.all([
      retailerIds.length > 0 ? db.select().from(retailers).where(withTenant(retailers, tenantId, inArray(retailers.id, retailerIds))) : [],
      invoiceIds.length > 0 ? db.select().from(salesInvoiceItems).where(withTenant(salesInvoiceItems, tenantId, inArray(salesInvoiceItems.invoiceId, invoiceIds))) : [],
      invoiceIds.length > 0 ? db.select().from(salesPayments).where(withTenant(salesPayments, tenantId, inArray(salesPayments.invoiceId, invoiceIds))) : []
    ]);
    
    // Create lookup maps
    const retailerMap = new Map(retailersData.map(r => [r.id, r]));
    const itemsMap = new Map<string, any[]>();
    const paymentsMap = new Map<string, any[]>();
    
    itemsData.forEach(item => {
      if (!itemsMap.has(item.invoiceId)) {
        itemsMap.set(item.invoiceId, []);
      }
      itemsMap.get(item.invoiceId)!.push(item);
    });
    
    paymentsData.forEach(payment => {
      if (!paymentsMap.has(payment.invoiceId)) {
        paymentsMap.set(payment.invoiceId, []);
      }
      paymentsMap.get(payment.invoiceId)!.push(payment);
    });
    
    // Assemble final data - include invoices with null retailers for legacy compatibility
    const result = invoices.map(invoice => {
      const retailer = retailerMap.get(invoice.retailerId) || null;
      return {
        ...invoice,
        retailer,
        items: itemsMap.get(invoice.id) || [],
        payments: paymentsMap.get(invoice.id) || []
      };
    }) as SalesInvoiceWithNullableRetailer[];

    return result as any;
  }

  async getSalesInvoice(tenantId: string, id: string): Promise<SalesInvoiceWithDetails | undefined> {
    const [invoice] = await db.select().from(salesInvoices)
      .where(withTenant(salesInvoices, tenantId, eq(salesInvoices.id, id)));

    if (!invoice) {
      return undefined;
    }

    const [retailer] = await db.select().from(retailers)
      .where(withTenant(retailers, tenantId, eq(retailers.id, invoice.retailerId)));
    
    if (!retailer) {
      throw new Error('Invoice retailer not found');
    }
    
    const itemsList = await db.select().from(salesInvoiceItems)
      .where(withTenant(salesInvoiceItems, tenantId, eq(salesInvoiceItems.invoiceId, invoice.id)));
    const paymentsList = await db.select().from(salesPayments)
      .where(withTenant(salesPayments, tenantId, eq(salesPayments.invoiceId, invoice.id)));

    return { ...invoice, retailer, items: itemsList, payments: paymentsList };
  }

  async createSalesInvoice(tenantId: string, invoiceData: InsertSalesInvoice, itemsData: InsertSalesInvoiceItem[]): Promise<SalesInvoiceWithDetails> {
    return await db.transaction(async (tx) => {
      // Generate invoice number with SI prefix + compact timestamp suffix
      const invoiceNumber = `SI${String(Date.now()).slice(-6)}`;
      
      const invoiceWithTenant = ensureTenantInsert({
        ...invoiceData,
        invoiceNumber,
        balanceAmount: invoiceData.totalAmount,
        status: 'Unpaid'
      }, tenantId);
      const [invoice] = await tx.insert(salesInvoices).values(invoiceWithTenant).returning();
      
      const itemsWithInvoiceId = itemsData.map(item => ensureTenantInsert({
        ...item,
        invoiceId: invoice.id
      }, tenantId));
      
      const createdItems = await tx.insert(salesInvoiceItems).values(itemsWithInvoiceId).returning();
      
      const [retailer] = await tx.select().from(retailers)
        .where(withTenant(retailers, tenantId, eq(retailers.id, invoice.retailerId)));
      
      if (!retailer) {
        throw new Error('Invoice retailer not found');
      }
      
      return { ...invoice, retailer, items: createdItems, payments: [] };
    });
  }

  async markSalesInvoiceAsPaid(tenantId: string, invoiceId: string): Promise<{ invoice: SalesInvoice; shortfallAdded: string; retailer: any }> {
    return await db.transaction(async (tx) => {
      // Get the invoice with tenant filtering
      const [invoice] = await tx.select().from(salesInvoices)
        .where(withTenant(salesInvoices, tenantId, eq(salesInvoices.id, invoiceId)));
      
      if (!invoice) {
        throw new Error('Invoice not found');
      }
      
      // Get the retailer with tenant filtering
      const [retailer] = await tx.select().from(retailers)
        .where(withTenant(retailers, tenantId, eq(retailers.id, invoice.retailerId)));
      
      if (!retailer) {
        throw new Error('Retailer not found');
      }
      
      // Calculate shortfall amount from balance amount
      const shortfallAmount = parseFloat(invoice.balanceAmount);
      
      // Update invoice with paid status and amounts
      const [updatedInvoice] = await tx.update(salesInvoices)
        .set({ 
          status: 'Paid',
          paidAmount: invoice.totalAmount,
          balanceAmount: '0.00',
          shortfallAmount: shortfallAmount.toString()
        })
        .where(withTenant(salesInvoices, tenantId, eq(salesInvoices.id, invoiceId)))
        .returning();
      
      // Update retailer shortfall balance if there's a shortfall
      let updatedRetailer = retailer;
      if (shortfallAmount > 0) {
        const newShortfallBalance = parseFloat(retailer.shortfallBalance || '0') + shortfallAmount;
        
        [updatedRetailer] = await tx.update(retailers)
          .set({ shortfallBalance: newShortfallBalance.toString() })
          .where(withTenant(retailers, tenantId, eq(retailers.id, retailer.id)))
          .returning();
      }
      
      return {
        invoice: updatedInvoice,
        shortfallAdded: shortfallAmount.toString(),
        retailer: updatedRetailer
      };
    });
  }

  async getSalesInvoicesPaginated(tenantId: string, options?: PaginationOptions & {
    search?: string;
    status?: 'paid' | 'unpaid';
    retailerId?: string;
    dateRange?: { from?: string; to?: string };
  }): Promise<PaginatedResult<SalesInvoiceWithDetails>> {
    const { page, limit, offset } = normalizePaginationOptions(options || {});
    
    // Build WHERE conditions array with tenant filtering
    const whereConditions = [withTenant(salesInvoices, tenantId)];
    
    // Apply status filter
    if (options?.status === 'paid') {
      whereConditions.push(eq(salesInvoices.status, 'Paid'));
    } else if (options?.status === 'unpaid') {
      whereConditions.push(or(
        eq(salesInvoices.status, 'Unpaid'),
        eq(salesInvoices.status, 'Partially Paid')
      )!);
    }
    
    // Apply retailer filter
    if (options?.retailerId) {
      whereConditions.push(eq(salesInvoices.retailerId, options.retailerId));
    }
    
    // Apply date range filter
    if (options?.dateRange?.from) {
      whereConditions.push(gte(salesInvoices.invoiceDate, new Date(options.dateRange.from)));
    }
    if (options?.dateRange?.to) {
      whereConditions.push(lte(salesInvoices.invoiceDate, new Date(options.dateRange.to)));
    }
    
    // Handle search by getting matching retailer IDs or invoice numbers/status
    if (options?.search) {
      // Get retailer IDs that match search with tenant filtering
      const matchingRetailers = await db.select({ id: retailers.id })
        .from(retailers)
        .where(withTenant(retailers, tenantId, ilike(retailers.name, `%${options.search}%`)));
      const retailerIds = matchingRetailers.map(r => r.id);
      
      // Build search conditions
      const searchConditions = [];
      
      // Search in invoice number
      searchConditions.push(ilike(salesInvoices.invoiceNumber, `%${options.search}%`));
      
      // Search in status
      searchConditions.push(ilike(salesInvoices.status, `%${options.search}%`));
      
      // Search in matching retailer IDs
      if (retailerIds.length > 0) {
        searchConditions.push(inArray(salesInvoices.retailerId, retailerIds));
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
      orderByClause = sortOrder === 'asc' ? asc(salesInvoices.invoiceDate) : desc(salesInvoices.invoiceDate);
    } else if (sortBy === 'invoiceNumber') {
      orderByClause = sortOrder === 'asc' ? asc(salesInvoices.invoiceNumber) : desc(salesInvoices.invoiceNumber);
    } else if (sortBy === 'totalAmount') {
      orderByClause = sortOrder === 'asc' ? asc(salesInvoices.totalAmount) : desc(salesInvoices.totalAmount);
    } else if (sortBy === 'status') {
      orderByClause = sortOrder === 'asc' ? asc(salesInvoices.status) : desc(salesInvoices.status);
    } else { // default to createdAt
      orderByClause = sortOrder === 'asc' ? asc(salesInvoices.createdAt) : desc(salesInvoices.createdAt);
    }
    
    // Build and execute paginated query
    const invoicesData = await (
      finalWhereCondition
        ? db.select()
          .from(salesInvoices)
          .where(finalWhereCondition)
          .orderBy(orderByClause)
          .limit(limit)
          .offset(offset)
        : db.select()
          .from(salesInvoices)
          .orderBy(orderByClause)
          .limit(limit)
          .offset(offset)
    );
    
    // Batch fetch retailers, items, and payments for all invoices
    const retailerIdsSet = new Set(invoicesData.map(inv => inv.retailerId));
    const retailerIds = Array.from(retailerIdsSet);
    const invoiceIds = invoicesData.map(inv => inv.id);
    
    const [retailersData, itemsData, paymentsData] = await Promise.all([
      retailerIds.length > 0 ? db.select().from(retailers).where(withTenant(retailers, tenantId, inArray(retailers.id, retailerIds))) : [],
      invoiceIds.length > 0 ? db.select().from(salesInvoiceItems).where(withTenant(salesInvoiceItems, tenantId, inArray(salesInvoiceItems.invoiceId, invoiceIds))) : [],
      invoiceIds.length > 0 ? db.select().from(salesPayments).where(withTenant(salesPayments, tenantId, inArray(salesPayments.invoiceId, invoiceIds))) : []
    ]);
    
    // Create lookup maps
    const retailerMap = new Map(retailersData.map(r => [r.id, r]));
    const itemsMap = new Map<string, any[]>();
    const paymentsMap = new Map<string, any[]>();
    
    itemsData.forEach(item => {
      if (!itemsMap.has(item.invoiceId)) {
        itemsMap.set(item.invoiceId, []);
      }
      itemsMap.get(item.invoiceId)!.push(item);
    });
    
    paymentsData.forEach(payment => {
      if (!paymentsMap.has(payment.invoiceId)) {
        paymentsMap.set(payment.invoiceId, []);
      }
      paymentsMap.get(payment.invoiceId)!.push(payment);
    });
    
    // Assemble final data - include invoices with null retailers for legacy compatibility
    const data = invoicesData.map(invoice => {
      const retailer = retailerMap.get(invoice.retailerId) || null;
      return {
        ...invoice,
        retailer,
        items: itemsMap.get(invoice.id) || [],
        payments: paymentsMap.get(invoice.id) || []
      };
    }) as SalesInvoiceWithNullableRetailer[];
    
    // Get total count with same conditions
    const [{ count: total }] = await (
      finalWhereCondition
        ? db.select({ count: count() })
          .from(salesInvoices)
          .where(finalWhereCondition)
        : db.select({ count: count() })
          .from(salesInvoices)
    );
    
    const pagination = buildPaginationMetadata(page, limit, total);
    
    return { data: data as any, pagination };
  }
}