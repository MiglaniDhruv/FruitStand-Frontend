import { eq, desc, inArray } from 'drizzle-orm';
import { db } from '../../../db';
import { payments, purchaseInvoices, vendors, bankAccounts, type Payment, type InsertPayment, type PaymentWithDetails } from '@shared/schema';
import { withTenant, ensureTenantInsert } from '../../utils/tenant-scope';

export class PaymentModel {
  async getPayments(tenantId: string): Promise<PaymentWithDetails[]> {
    const paymentsList = await db.select().from(payments)
      .where(withTenant(payments, tenantId))
      .orderBy(desc(payments.createdAt));

    if (paymentsList.length === 0) {
      return [];
    }

    // Collect unique IDs for batch fetching
    const invoiceIdsSet = new Set(paymentsList.map(p => p.invoiceId));
    const vendorIdsSet = new Set(paymentsList.map(p => p.vendorId));
    const bankAccountIdsSet = new Set(paymentsList.filter(p => p.bankAccountId).map(p => p.bankAccountId!));
    
    const invoiceIds = Array.from(invoiceIdsSet);
    const vendorIds = Array.from(vendorIdsSet);
    const bankAccountIds = Array.from(bankAccountIdsSet);

    // Batch fetch related data with tenant filtering
    const [invoicesData, vendorsData, bankAccountsData] = await Promise.all([
      invoiceIds.length > 0 ? db.select().from(purchaseInvoices).where(withTenant(purchaseInvoices, tenantId, inArray(purchaseInvoices.id, invoiceIds))) : [],
      vendorIds.length > 0 ? db.select().from(vendors).where(withTenant(vendors, tenantId, inArray(vendors.id, vendorIds))) : [],
      bankAccountIds.length > 0 ? db.select().from(bankAccounts).where(withTenant(bankAccounts, tenantId, inArray(bankAccounts.id, bankAccountIds))) : []
    ]);

    // Create lookup maps
    const invoiceMap = new Map(invoicesData.map(i => [i.id, i]));
    const vendorMap = new Map(vendorsData.map(v => [v.id, v]));
    const bankAccountMap = new Map(bankAccountsData.map(b => [b.id, b]));

    // Assemble final data - filter out payments without required related entities
    const result = paymentsList
      .map(payment => {
        const invoice = invoiceMap.get(payment.invoiceId);
        const vendor = vendorMap.get(payment.vendorId);
        
        // Both invoice and vendor are required per PaymentWithDetails type
        if (!invoice || !vendor) {
          return null;
        }
        
        return {
          ...payment,
          invoice,
          vendor,
          bankAccount: payment.bankAccountId ? (bankAccountMap.get(payment.bankAccountId) || null) : null
        };
      })
      .filter(payment => payment !== null) as PaymentWithDetails[];

    return result;
  }

  async getPaymentsByInvoice(tenantId: string, invoiceId: string): Promise<PaymentWithDetails[]> {
    const paymentsList = await db.select().from(payments)
      .where(withTenant(payments, tenantId, eq(payments.invoiceId, invoiceId)))
      .orderBy(desc(payments.createdAt));

    if (paymentsList.length === 0) {
      return [];
    }

    // Collect unique IDs for batch fetching
    const invoiceIdsSet = new Set(paymentsList.map(p => p.invoiceId));
    const vendorIdsSet = new Set(paymentsList.map(p => p.vendorId));
    const bankAccountIdsSet = new Set(paymentsList.filter(p => p.bankAccountId).map(p => p.bankAccountId!));
    
    const invoiceIds = Array.from(invoiceIdsSet);
    const vendorIds = Array.from(vendorIdsSet);
    const bankAccountIds = Array.from(bankAccountIdsSet);

    // Batch fetch related data with tenant filtering
    const [invoicesData, vendorsData, bankAccountsData] = await Promise.all([
      invoiceIds.length > 0 ? db.select().from(purchaseInvoices).where(withTenant(purchaseInvoices, tenantId, inArray(purchaseInvoices.id, invoiceIds))) : [],
      vendorIds.length > 0 ? db.select().from(vendors).where(withTenant(vendors, tenantId, inArray(vendors.id, vendorIds))) : [],
      bankAccountIds.length > 0 ? db.select().from(bankAccounts).where(withTenant(bankAccounts, tenantId, inArray(bankAccounts.id, bankAccountIds))) : []
    ]);

    // Create lookup maps
    const invoiceMap = new Map(invoicesData.map(i => [i.id, i]));
    const vendorMap = new Map(vendorsData.map(v => [v.id, v]));
    const bankAccountMap = new Map(bankAccountsData.map(b => [b.id, b]));

    // Assemble final data - filter out payments without required related entities
    const result = paymentsList
      .map(payment => {
        const invoice = invoiceMap.get(payment.invoiceId);
        const vendor = vendorMap.get(payment.vendorId);
        
        // Both invoice and vendor are required per PaymentWithDetails type
        if (!invoice || !vendor) {
          return null;
        }
        
        return {
          ...payment,
          invoice,
          vendor,
          bankAccount: payment.bankAccountId ? (bankAccountMap.get(payment.bankAccountId) || null) : null
        };
      })
      .filter(payment => payment !== null) as PaymentWithDetails[];

    return result;
  }

  async createPayment(tenantId: string, paymentData: InsertPayment): Promise<PaymentWithDetails> {
    const paymentWithTenant = ensureTenantInsert(paymentData, tenantId);
    const [payment] = await db.insert(payments).values(paymentWithTenant).returning();
    
    // Fetch related data for response with tenant filtering
    const [invoice] = await db.select().from(purchaseInvoices)
      .where(withTenant(purchaseInvoices, tenantId, eq(purchaseInvoices.id, payment.invoiceId)));
    
    const [vendor] = await db.select().from(vendors)
      .where(withTenant(vendors, tenantId, eq(vendors.id, payment.vendorId)));
    
    if (!invoice) {
      throw new Error('Payment invoice not found');
    }
    
    if (!vendor) {
      throw new Error('Payment vendor not found');
    }
    
    let bankAccount = null;
    if (payment.bankAccountId) {
      const [bankAccountData] = await db.select().from(bankAccounts)
        .where(withTenant(bankAccounts, tenantId, eq(bankAccounts.id, payment.bankAccountId)));
      bankAccount = bankAccountData || null;
    }
    
    return {
      ...payment,
      invoice,
      vendor,
      bankAccount: bankAccount || undefined
    };
  }
}