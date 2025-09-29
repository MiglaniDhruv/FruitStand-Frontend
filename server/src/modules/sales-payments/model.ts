import { eq, desc, and, inArray } from 'drizzle-orm';
import { db } from '../../../db';
import { salesPayments, salesInvoices, retailers, bankAccounts, type SalesPayment, type InsertSalesPayment, type SalesPaymentWithDetails } from '@shared/schema';
import { withTenant, ensureTenantInsert } from '../../utils/tenant-scope';

export class SalesPaymentModel {
  async getSalesPayments(tenantId: string, includeDetails: boolean = false): Promise<SalesPayment[] | SalesPaymentWithDetails[]> {
    if (!includeDetails) {
      return await db.select().from(salesPayments)
        .where(withTenant(salesPayments, tenantId))
        .orderBy(desc(salesPayments.createdAt));
    }
    const paymentsData = await db.select().from(salesPayments)
      .where(withTenant(salesPayments, tenantId))
      .orderBy(desc(salesPayments.createdAt));

    if (paymentsData.length === 0) {
      return [];
    }

    // Batch fetch related data
    const invoiceIds = paymentsData.map(p => p.invoiceId);
    const retailerIds = paymentsData.map(p => p.retailerId);
    const bankAccountIds = paymentsData
      .map(p => p.bankAccountId)
      .filter(id => id !== null) as string[];

    const [invoicesData, retailersData, bankAccountsData] = await Promise.all([
      invoiceIds.length > 0 ? db.select().from(salesInvoices).where(withTenant(salesInvoices, tenantId, inArray(salesInvoices.id, invoiceIds))) : [],
      retailerIds.length > 0 ? db.select().from(retailers).where(withTenant(retailers, tenantId, inArray(retailers.id, retailerIds))) : [],
      bankAccountIds.length > 0 ? db.select().from(bankAccounts).where(withTenant(bankAccounts, tenantId, inArray(bankAccounts.id, bankAccountIds))) : []
    ]);

    // Create lookup maps
    const invoiceMap = new Map(invoicesData.map(i => [i.id, i]));
    const retailerMap = new Map(retailersData.map(r => [r.id, r]));
    const bankAccountMap = new Map(bankAccountsData.map(b => [b.id, b]));

    // Assemble final data - filter out payments without required relationships
    const result = paymentsData
      .map(payment => {
        const invoice = invoiceMap.get(payment.invoiceId);
        const retailer = retailerMap.get(payment.retailerId);
        if (!invoice || !retailer) return null;
        return {
          ...payment,
          invoice,
          retailer,
          bankAccount: payment.bankAccountId ? bankAccountMap.get(payment.bankAccountId) : undefined
        };
      })
      .filter(payment => payment !== null) as SalesPaymentWithDetails[];

    return result;
  }

  async getSalesPaymentsByInvoice(tenantId: string, invoiceId: string, includeDetails: boolean = false): Promise<SalesPayment[] | SalesPaymentWithDetails[]> {
    if (!includeDetails) {
      return await db.select().from(salesPayments)
        .where(withTenant(salesPayments, tenantId, eq(salesPayments.invoiceId, invoiceId)))
        .orderBy(desc(salesPayments.createdAt));
    }
    const paymentsData = await db.select().from(salesPayments)
      .where(withTenant(salesPayments, tenantId, eq(salesPayments.invoiceId, invoiceId)))
      .orderBy(desc(salesPayments.createdAt));

    if (paymentsData.length === 0) {
      return [];
    }

    // Get unique retailer and bank account IDs
    const retailerIdsSet = new Set(paymentsData.map(p => p.retailerId));
    const retailerIds = Array.from(retailerIdsSet);
    const bankAccountIds = paymentsData
      .map(p => p.bankAccountId)
      .filter(id => id !== null) as string[];
    const bankAccountIdsSet = new Set(bankAccountIds);
    const uniqueBankAccountIds = Array.from(bankAccountIdsSet);

    const [invoice, retailersData, bankAccountsData] = await Promise.all([
      db.select().from(salesInvoices).where(withTenant(salesInvoices, tenantId, eq(salesInvoices.id, invoiceId))).then(result => result[0]),
      retailerIds.length > 0 ? db.select().from(retailers).where(withTenant(retailers, tenantId, inArray(retailers.id, retailerIds))) : [],
      uniqueBankAccountIds.length > 0 ? db.select().from(bankAccounts).where(withTenant(bankAccounts, tenantId, inArray(bankAccounts.id, uniqueBankAccountIds))) : []
    ]);

    if (!invoice) {
      return [];
    }

    // Create lookup maps
    const retailerMap = new Map(retailersData.map(r => [r.id, r]));
    const bankAccountMap = new Map(bankAccountsData.map(b => [b.id, b]));

    // Assemble final data - filter out payments without retailers
    const result = paymentsData
      .map(payment => {
        const retailer = retailerMap.get(payment.retailerId);
        if (!retailer) return null;
        return {
          ...payment,
          invoice,
          retailer,
          bankAccount: payment.bankAccountId ? bankAccountMap.get(payment.bankAccountId) : undefined
        };
      })
      .filter(payment => payment !== null) as SalesPaymentWithDetails[];

    return result;
  }

  async createSalesPayment(tenantId: string, paymentData: InsertSalesPayment): Promise<SalesPaymentWithDetails> {
    const paymentWithTenant = ensureTenantInsert(paymentData, tenantId);
    const [payment] = await db.insert(salesPayments).values(paymentWithTenant).returning();

    // Get related data with tenant filtering
    const [invoice, retailer, bankAccount] = await Promise.all([
      db.select().from(salesInvoices).where(withTenant(salesInvoices, tenantId, eq(salesInvoices.id, payment.invoiceId))).then(result => result[0]),
      db.select().from(retailers).where(withTenant(retailers, tenantId, eq(retailers.id, payment.retailerId))).then(result => result[0]),
      payment.bankAccountId ? 
        db.select().from(bankAccounts).where(withTenant(bankAccounts, tenantId, eq(bankAccounts.id, payment.bankAccountId))).then(result => result[0]) : 
        undefined
    ]);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (!retailer) {
      throw new Error('Retailer not found');
    }

    return {
      ...payment,
      invoice,
      retailer,
      bankAccount
    };
  }
}