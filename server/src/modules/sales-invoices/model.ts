import { eq, desc, asc, and, or, gte, lte, ilike, inArray, count, sql, sum } from 'drizzle-orm';
import { db } from '../../../db';
import { salesInvoices, salesInvoiceItems, retailers, salesPayments, invoiceShareLinks, stockMovements, crateTransactions, items, type SalesInvoice, type InsertSalesInvoice, type InsertSalesInvoiceItem, type InsertCrateTransaction, type SalesInvoiceWithDetails, type PaginationOptions, type PaginatedResult, type Retailer, type InvoiceShareLink, type CrateTransaction } from '@shared/schema';
import { normalizePaginationOptions, buildPaginationMetadata } from '../../utils/pagination';
import { withTenant, ensureTenantInsert } from '../../utils/tenant-scope';
import { InvoiceShareLinkModel } from '../invoice-share-links/model';
import { CrateModel } from '../crates/model';
import { StockModel } from '../stock/model';

// Local type that allows null retailers for legacy compatibility
type SalesInvoiceWithNullableRetailer = SalesInvoice & {
  retailer: Retailer | null;
  items: any[];
  payments: any[];
};

export class SalesInvoiceModel {
  private shareModel = new InvoiceShareLinkModel();
  private crateModel = new CrateModel();
  private stockModel = new StockModel();

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
    
    const [retailersData, itemsDataWithDetails, paymentsData] = await Promise.all([
      retailerIds.length > 0 ? db.select().from(retailers).where(withTenant(retailers, tenantId, inArray(retailers.id, retailerIds))) : [],
      invoiceIds.length > 0 ? db.select({
        invoiceItem: salesInvoiceItems,
        item: items
      })
      .from(salesInvoiceItems)
      .innerJoin(items, eq(salesInvoiceItems.itemId, items.id))
      .where(withTenant(salesInvoiceItems, tenantId, inArray(salesInvoiceItems.invoiceId, invoiceIds))) : [],
      invoiceIds.length > 0 ? db.select().from(salesPayments).where(withTenant(salesPayments, tenantId, inArray(salesPayments.invoiceId, invoiceIds))) : []
    ]);
    
    // Create lookup maps
    const retailerMap = new Map(retailersData.map(r => [r.id, r]));
    const itemsMap = new Map<string, any[]>();
    const paymentsMap = new Map<string, any[]>();
    
    itemsDataWithDetails.forEach(({ invoiceItem, item }) => {
      if (!itemsMap.has(invoiceItem.invoiceId)) {
        itemsMap.set(invoiceItem.invoiceId, []);
      }
      // Map the results to include item details in the invoice item objects
      itemsMap.get(invoiceItem.invoiceId)!.push({
        ...invoiceItem,
        item: `${item.name} - ${item.quality}`, // Format as "Name - Quality"
        itemName: item.name,
        itemQuality: item.quality,
        itemUnit: item.unit
      });
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
    
    // Join with items table to get item details including name, quality, and unit
    const itemsListWithDetails = await db.select({
      invoiceItem: salesInvoiceItems,
      item: items
    })
    .from(salesInvoiceItems)
    .innerJoin(items, eq(salesInvoiceItems.itemId, items.id))
    .where(withTenant(salesInvoiceItems, tenantId, eq(salesInvoiceItems.invoiceId, invoice.id)));

    // Map the results to include item details in the invoice item objects
    const itemsList = itemsListWithDetails.map(({ invoiceItem, item }) => ({
      ...invoiceItem,
      item: `${item.name} - ${item.quality}`, // Format as "Name - Quality"
      itemName: item.name,
      itemQuality: item.quality,
      itemUnit: item.unit
    }));
    
    const paymentsList = await db.select().from(salesPayments)
      .where(withTenant(salesPayments, tenantId, eq(salesPayments.invoiceId, invoice.id)));

    return { ...invoice, retailer, items: itemsList, payments: paymentsList };
  }

  async createSalesInvoice(tenantId: string, invoiceData: InsertSalesInvoice, itemsData: InsertSalesInvoiceItem[], crateTransactionData?: InsertCrateTransaction): Promise<SalesInvoiceWithDetails> {
    return await db.transaction(async (tx) => {
      // Generate invoice number with SI prefix + compact timestamp suffix
      const invoiceNumber = `SI${String(Date.now()).slice(-6)}`;
      
      const invoiceWithTenant = ensureTenantInsert({
        ...invoiceData,
        invoiceNumber,
        udhaaarAmount: invoiceData.totalAmount,
        balanceAmount: invoiceData.totalAmount,
        status: 'Unpaid'
      }, tenantId);
      const [invoice] = await tx.insert(salesInvoices).values(invoiceWithTenant).returning();
      
      const itemsWithInvoiceId = itemsData.map(item => ensureTenantInsert({
        ...item,
        invoiceId: invoice.id
      }, tenantId));
      
      const createdItems = await tx.insert(salesInvoiceItems).values(itemsWithInvoiceId).returning();
      
      // Create stock OUT movements for each item
      for (const item of createdItems) {
        const movementData = {
          tenantId,
          itemId: item.itemId,
          movementType: 'OUT' as const,
          quantityInCrates: item.crates || '0',
          quantityInBoxes: item.boxes || '0',
          quantityInKgs: item.weight,
          rate: item.rate,
          referenceType: 'SALES_INVOICE' as const,
          referenceId: invoice.id,
          referenceNumber: invoice.invoiceNumber,
          retailerId: invoice.retailerId,
          movementDate: invoice.invoiceDate,
          notes: 'Auto-generated from sales invoice'
        };
        
        await this.stockModel.createStockMovement(tenantId, movementData, tx);
      }
      
      const [retailer] = await tx.select().from(retailers)
        .where(withTenant(retailers, tenantId, eq(retailers.id, invoice.retailerId)));
      
      if (!retailer) {
        throw new Error('Invoice retailer not found');
      }

      // Update retailer's udhaaarBalance by the invoice's totalAmount
      const newUdhaaarBalance = parseFloat(retailer.udhaaarBalance || '0') + parseFloat(invoice.totalAmount);
      await tx.update(retailers)
        .set({ udhaaarBalance: newUdhaaarBalance.toFixed(2) })
        .where(withTenant(retailers, tenantId, eq(retailers.id, invoice.retailerId)));

      // Update retailer object with fresh udhaaar balance
      retailer.udhaaarBalance = newUdhaaarBalance.toFixed(2);

      // Create crate transaction if provided
      let crateTransaction: CrateTransaction | undefined;
      if (crateTransactionData) {
        crateTransaction = await this.crateModel.createCrateTransaction(tenantId, {
          ...crateTransactionData,
          salesInvoiceId: invoice.id
        }, tx);
      }
      
      return { ...invoice, retailer, items: createdItems, payments: [], crateTransaction };
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
      
      // Calculate shortfall amount from udhaaar amount
      const shortfallAmount = parseFloat(invoice.udhaaarAmount || '0');
      
      // Update invoice with paid status and amounts
      const [updatedInvoice] = await tx.update(salesInvoices)
        .set({ 
          status: 'Paid',
          paidAmount: invoice.totalAmount,
          udhaaarAmount: '0.00',
          shortfallAmount: shortfallAmount.toFixed(2)
        })
        .where(withTenant(salesInvoices, tenantId, eq(salesInvoices.id, invoiceId)))
        .returning();
      
      // Update retailer balances - decrease udhaaarBalance and increase shortfallBalance
      const newUdhaaarBalance = Math.max(0, parseFloat(retailer.udhaaarBalance || '0') - parseFloat(invoice.udhaaarAmount || '0'));
      const newShortfallBalance = parseFloat(retailer.shortfallBalance || '0') + shortfallAmount;
      
      const [updatedRetailer] = await tx.update(retailers)
        .set({ 
          shortfallBalance: newShortfallBalance.toFixed(2),
          udhaaarBalance: newUdhaaarBalance.toFixed(2)
        })
        .where(withTenant(retailers, tenantId, eq(retailers.id, retailer.id)))
        .returning();
      
      return {
        invoice: updatedInvoice,
        shortfallAdded: shortfallAmount.toString(),
        retailer: updatedRetailer
      };
    });
  }

  async revertInvoiceStatus(tenantId: string, invoiceId: string): Promise<{ invoice: SalesInvoice; shortfallReverted: string; retailer: any }> {
    return await db.transaction(async (tx) => {
      // Get the invoice with tenant filtering
      const [invoice] = await tx.select().from(salesInvoices)
        .where(withTenant(salesInvoices, tenantId, eq(salesInvoices.id, invoiceId)));
      
      if (!invoice) {
        throw new Error('Invoice not found');
      }
      
      // Validate invoice status
      if (invoice.status !== 'Paid') {
        throw new Error('Can only revert invoices with Paid status');
      }
      
      // Get the retailer with tenant filtering
      const [retailer] = await tx.select().from(retailers)
        .where(withTenant(retailers, tenantId, eq(retailers.id, invoice.retailerId)));
      
      if (!retailer) {
        throw new Error('Retailer not found');
      }
      
      // Calculate amounts to transfer
      const shortfallToRevert = parseFloat(invoice.shortfallAmount || '0');
      const newUdhaaarAmount = parseFloat(invoice.udhaaarAmount || '0') + shortfallToRevert;
      
      // Recalculate the true paidAmount by summing actual payments for this invoice
      const paymentsResult = await tx.select({ 
        totalPaid: sum(salesPayments.amount) 
      })
      .from(salesPayments)
      .where(withTenant(salesPayments, tenantId, eq(salesPayments.invoiceId, invoiceId)));
      
      const truePaidAmount = parseFloat(paymentsResult[0]?.totalPaid || '0');
      
      // Recalculate invoice status using the same logic as payment distribution
      const epsilon = 0.005; // Half a cent for floating-point precision
      let newStatus: string;
      
      if (Math.abs(newUdhaaarAmount) < epsilon) {
        newStatus = 'Paid';
      } else if (truePaidAmount > 0) {
        newStatus = 'Partially Paid';
      } else {
        newStatus = 'Unpaid';
      }
      
      // Update the invoice
      const [updatedInvoice] = await tx.update(salesInvoices)
        .set({
          udhaaarAmount: newUdhaaarAmount.toFixed(2),
          paidAmount: truePaidAmount.toFixed(2),
          shortfallAmount: '0.00',
          status: newStatus as any
        })
        .where(withTenant(salesInvoices, tenantId, eq(salesInvoices.id, invoiceId)))
        .returning();
      
      // Update retailer balances - increase udhaaarBalance and decrease shortfallBalance
      let updatedRetailer = retailer;
      if (shortfallToRevert > 0) {
        const newUdhaaarBalance = parseFloat(retailer.udhaaarBalance || '0') + shortfallToRevert;
        const newShortfallBalance = Math.max(0, parseFloat(retailer.shortfallBalance || '0') - shortfallToRevert);
        [updatedRetailer] = await tx.update(retailers)
          .set({ 
            shortfallBalance: newShortfallBalance.toFixed(2),
            udhaaarBalance: newUdhaaarBalance.toFixed(2)
          })
          .where(withTenant(retailers, tenantId, eq(retailers.id, retailer.id)))
          .returning();
      }
      
      return { 
        invoice: updatedInvoice, 
        shortfallReverted: shortfallToRevert.toFixed(2), 
        retailer: updatedRetailer 
      };
    });
  }

  async deleteSalesInvoice(tenantId: string, id: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      // First, get the invoice and retailer to check for shortfall amount that needs to be reversed
      const [invoice] = await tx.select().from(salesInvoices)
        .where(and(
          withTenant(salesInvoices, tenantId),
          eq(salesInvoices.id, id)
        ));
      
      if (!invoice) {
        return false;
      }
      
      let retailer = null;
      if (parseFloat(invoice.shortfallAmount || '0') > 0 || parseFloat(invoice.udhaaarAmount || '0') > 0) {
        [retailer] = await tx.select().from(retailers)
          .where(and(
            withTenant(retailers, tenantId),
            eq(retailers.id, invoice.retailerId)
          ));
      }
      
      // Delete related records in cascade order (children first, then parent)
      
      // Delete invoice share links
      await tx.delete(invoiceShareLinks)
        .where(and(
          withTenant(invoiceShareLinks, tenantId),
          eq(invoiceShareLinks.invoiceId, id),
          eq(invoiceShareLinks.invoiceType, 'sales')
        ));
      
      // Delete stock movements
      await tx.delete(stockMovements)
        .where(and(
          withTenant(stockMovements, tenantId),
          eq(stockMovements.referenceType, 'SALES_INVOICE'),
          eq(stockMovements.referenceId, id)
        ));
      
      // Delete sales payments
      await tx.delete(salesPayments)
        .where(and(
          withTenant(salesPayments, tenantId),
          eq(salesPayments.invoiceId, id)
        ));
      
      // Delete sales invoice items
      await tx.delete(salesInvoiceItems)
        .where(and(
          withTenant(salesInvoiceItems, tenantId),
          eq(salesInvoiceItems.invoiceId, id)
        ));
      
      // Update retailer balances to reverse changes made during invoice lifecycle
      if (retailer) {
        const shortfallAmount = parseFloat(invoice.shortfallAmount || '0');
        const udhaaarAmount = parseFloat(invoice.udhaaarAmount || '0');
        
        const newShortfallBalance = Math.max(0, parseFloat(retailer.shortfallBalance || '0') - shortfallAmount);
        const newUdhaaarBalance = Math.max(0, parseFloat(retailer.udhaaarBalance || '0') - udhaaarAmount);
        
        await tx.update(retailers)
          .set({ 
            shortfallBalance: newShortfallBalance.toFixed(2),
            udhaaarBalance: newUdhaaarBalance.toFixed(2)
          })
          .where(and(
            withTenant(retailers, tenantId),
            eq(retailers.id, retailer.id)
          ));
      }
      
      // Finally delete the sales invoice itself
      const [deletedInvoice] = await tx.delete(salesInvoices)
        .where(and(
          withTenant(salesInvoices, tenantId),
          eq(salesInvoices.id, id)
        ))
        .returning();
      
      return !!deletedInvoice;
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
    
    const [retailersData, itemsDataWithDetails, paymentsData] = await Promise.all([
      retailerIds.length > 0 ? db.select().from(retailers).where(withTenant(retailers, tenantId, inArray(retailers.id, retailerIds))) : [],
      invoiceIds.length > 0 ? db.select({
        invoiceItem: salesInvoiceItems,
        item: items
      })
      .from(salesInvoiceItems)
      .innerJoin(items, eq(salesInvoiceItems.itemId, items.id))
      .where(withTenant(salesInvoiceItems, tenantId, inArray(salesInvoiceItems.invoiceId, invoiceIds))) : [],
      invoiceIds.length > 0 ? db.select().from(salesPayments).where(withTenant(salesPayments, tenantId, inArray(salesPayments.invoiceId, invoiceIds))) : []
    ]);
    
    // Create lookup maps
    const retailerMap = new Map(retailersData.map(r => [r.id, r]));
    const itemsMap = new Map<string, any[]>();
    const paymentsMap = new Map<string, any[]>();
    
    itemsDataWithDetails.forEach(({ invoiceItem, item }) => {
      if (!itemsMap.has(invoiceItem.invoiceId)) {
        itemsMap.set(invoiceItem.invoiceId, []);
      }
      // Map the results to include item details in the invoice item objects
      itemsMap.get(invoiceItem.invoiceId)!.push({
        ...invoiceItem,
        item: `${item.name} - ${item.quality}`, // Format as "Name - Quality"
        itemName: item.name,
        itemQuality: item.quality,
        itemUnit: item.unit
      });
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