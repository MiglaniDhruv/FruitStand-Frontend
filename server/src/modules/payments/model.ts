import { eq, desc, inArray, and, or, gt, asc } from 'drizzle-orm';
import { db } from '../../../db';
import { payments, purchaseInvoices, vendors, bankAccounts, cashbook, bankbook, type Payment, type InsertPayment, type PaymentWithDetails, type PurchaseInvoice, type VendorPaymentDistributionResult } from '@shared/schema';
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

  async recordVendorPayment(
    tenantId: string, 
    vendorId: string, 
    paymentData: { 
      amount: string, 
      paymentMode: string, 
      paymentDate: Date, 
      bankAccountId?: string, 
      chequeNumber?: string, 
      upiReference?: string, 
      notes?: string 
    }
  ): Promise<VendorPaymentDistributionResult> {
    return await db.transaction(async (tx) => {
      // Validate vendor exists
      const vendor = await tx.select().from(vendors)
        .where(withTenant(vendors, tenantId, eq(vendors.id, vendorId)))
        .limit(1);

      if (vendor.length === 0) {
        throw new Error('Vendor not found');
      }

      // Fetch outstanding invoices (FIFO)
      const outstandingInvoices = await tx.select().from(purchaseInvoices)
        .where(withTenant(purchaseInvoices, tenantId, and(
          eq(purchaseInvoices.vendorId, vendorId),
          or(
            eq(purchaseInvoices.status, 'Unpaid'),
            eq(purchaseInvoices.status, 'Partially Paid')
          ),
          gt(purchaseInvoices.balanceAmount, '0')
        )))
        .orderBy(asc(purchaseInvoices.invoiceDate), asc(purchaseInvoices.createdAt));

      if (outstandingInvoices.length === 0) {
        throw new Error('No outstanding invoices found for this vendor');
      }

      let remainingPaymentAmount = parseFloat(paymentData.amount);
      const distributedAmount = parseFloat(paymentData.amount);
      const paymentsCreated: Payment[] = [];
      const invoicesUpdated: string[] = [];

      // Distribute payment amount across invoices
      for (const invoice of outstandingInvoices) {
        if (remainingPaymentAmount <= 0) break;

        const invoiceBalance = parseFloat(invoice.balanceAmount);
        const allocation = Math.min(remainingPaymentAmount, invoiceBalance);

        // Create payment record
        const paymentInsert = ensureTenantInsert({
          invoiceId: invoice.id,
          vendorId: vendorId,
          amount: allocation.toFixed(2),
          paymentMode: paymentData.paymentMode,
          paymentDate: paymentData.paymentDate,
          bankAccountId: paymentData.bankAccountId,
          chequeNumber: paymentData.chequeNumber,
          upiReference: paymentData.upiReference,
          notes: paymentData.notes,
        }, tenantId);

        const [createdPayment] = await tx.insert(payments).values(paymentInsert).returning();
        paymentsCreated.push(createdPayment);

        // Update invoice
        const newPaidAmount = parseFloat(invoice.paidAmount || '0') + allocation;
        const newBalanceAmount = parseFloat(invoice.balanceAmount) - allocation;
        let newStatus = invoice.status;

        // Use epsilon threshold to handle floating-point precision issues
        const epsilon = 0.005; // Half a cent
        if (Math.abs(newBalanceAmount) < epsilon) {
          newStatus = 'Paid';
        } else if (newPaidAmount > 0) {
          newStatus = 'Partially Paid';
        } else {
          newStatus = 'Unpaid';
        }

        await tx.update(purchaseInvoices)
          .set({
            paidAmount: newPaidAmount.toFixed(2),
            balanceAmount: newBalanceAmount.toFixed(2),
            status: newStatus
          })
          .where(withTenant(purchaseInvoices, tenantId, eq(purchaseInvoices.id, invoice.id)));

        invoicesUpdated.push(invoice.id);
        remainingPaymentAmount -= allocation;
      }

      // Update vendor balance
      const newVendorBalance = parseFloat(vendor[0].balance || '0') - (distributedAmount - remainingPaymentAmount);
      await tx.update(vendors)
        .set({ balance: newVendorBalance.toFixed(2) })
        .where(withTenant(vendors, tenantId, eq(vendors.id, vendorId)));

      // Create cashbook/bankbook entry
      if (paymentsCreated.length > 0) {
        if (paymentData.paymentMode === 'Cash') {
          // Get current cashbook balance
          const lastCashEntry = await tx.select().from(cashbook)
            .where(withTenant(cashbook, tenantId))
            .orderBy(desc(cashbook.createdAt))
            .limit(1);

          const currentBalance = lastCashEntry.length > 0 ? parseFloat(lastCashEntry[0].balance) : 0;
          const newBalance = currentBalance - (distributedAmount - remainingPaymentAmount);

          await tx.insert(cashbook).values(ensureTenantInsert({
            date: paymentData.paymentDate,
            description: `Vendor Payment - ${vendor[0].name}`,
            outflow: (distributedAmount - remainingPaymentAmount).toFixed(2),
            inflow: '0.00',
            balance: newBalance.toFixed(2),
            referenceType: 'Payment',
            referenceId: paymentsCreated[0].id,
          }, tenantId));
        } else if (paymentData.paymentMode === 'Bank' && paymentData.bankAccountId) {
          // Get current bank balance
          const lastBankEntry = await tx.select().from(bankbook)
            .where(withTenant(bankbook, tenantId, eq(bankbook.bankAccountId, paymentData.bankAccountId)))
            .orderBy(desc(bankbook.createdAt))
            .limit(1);

          const currentBalance = lastBankEntry.length > 0 ? parseFloat(lastBankEntry[0].balance) : 0;
          const newBalance = currentBalance - (distributedAmount - remainingPaymentAmount);

          await tx.insert(bankbook).values(ensureTenantInsert({
            bankAccountId: paymentData.bankAccountId,
            date: paymentData.paymentDate,
            description: `Vendor Payment - ${vendor[0].name}`,
            credit: (distributedAmount - remainingPaymentAmount).toFixed(2),
            debit: '0.00',
            balance: newBalance.toFixed(2),
            referenceType: 'Payment',
            referenceId: paymentsCreated[0].id,
          }, tenantId));
        }
      }

      return {
        totalAmount: paymentData.amount,
        distributedAmount: (distributedAmount - remainingPaymentAmount).toFixed(2),
        remainingAmount: remainingPaymentAmount.toFixed(2),
        paymentsCreated,
        invoicesUpdated,
        vendorBalanceAfter: newVendorBalance.toFixed(2),
      };
    });
  }

  async getOutstandingInvoicesForVendor(tenantId: string, vendorId: string): Promise<PurchaseInvoice[]> {
    return await db.select().from(purchaseInvoices)
      .where(withTenant(purchaseInvoices, tenantId, and(
        eq(purchaseInvoices.vendorId, vendorId),
        or(
          eq(purchaseInvoices.status, 'Unpaid'),
          eq(purchaseInvoices.status, 'Partially Paid')
        ),
        gt(purchaseInvoices.balanceAmount, '0')
      )))
      .orderBy(asc(purchaseInvoices.invoiceDate));
  }
}