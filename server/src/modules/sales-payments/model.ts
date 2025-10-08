import { eq, desc, and, inArray, or, gt, asc } from 'drizzle-orm';
import { db } from '../../../db';
import { salesPayments, salesInvoices, retailers, bankAccounts, cashbook, bankbook, type SalesPayment, type InsertSalesPayment, type SalesPaymentWithDetails, type SalesInvoice, type RetailerPaymentDistributionResult } from '@shared/schema';
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

  async recordRetailerPayment(
    tenantId: string, 
    retailerId: string, 
    paymentData: { 
      amount: string, 
      paymentMode: string, 
      paymentDate: Date, 
      bankAccountId?: string, 
      chequeNumber?: string, 
      upiReference?: string, 
      paymentLinkId?: string, 
      notes?: string 
    }
  ): Promise<RetailerPaymentDistributionResult> {
    return await db.transaction(async (tx) => {
      // Validate retailer exists
      const retailer = await tx.select().from(retailers)
        .where(withTenant(retailers, tenantId, eq(retailers.id, retailerId)))
        .limit(1);

      if (retailer.length === 0) {
        throw new Error('Retailer not found');
      }

      // Fetch outstanding invoices (FIFO)
      const outstandingInvoices = await tx.select().from(salesInvoices)
        .where(withTenant(salesInvoices, tenantId, and(
          eq(salesInvoices.retailerId, retailerId),
          or(
            eq(salesInvoices.status, 'Unpaid'),
            eq(salesInvoices.status, 'Partially Paid')
          ),
          gt(salesInvoices.udhaaarAmount, '0')
        )))
        .orderBy(asc(salesInvoices.invoiceDate), asc(salesInvoices.createdAt));

      if (outstandingInvoices.length === 0) {
        throw new Error('No outstanding invoices found for this retailer');
      }

      let remainingPaymentAmount = parseFloat(paymentData.amount);
      const distributedAmount = parseFloat(paymentData.amount);
      const paymentsCreated: SalesPayment[] = [];
      const invoicesUpdated: string[] = [];
      let totalShortfallCreated = 0;

      // Distribute payment amount across invoices
      for (const invoice of outstandingInvoices) {
        if (remainingPaymentAmount <= 0) break;

        const invoiceBalance = parseFloat(invoice.udhaaarAmount || '0');
        const allocation = Math.min(remainingPaymentAmount, invoiceBalance);

        // Create payment record
        const paymentInsert = ensureTenantInsert({
          invoiceId: invoice.id,
          retailerId: retailerId,
          amount: allocation.toFixed(2),
          paymentMode: paymentData.paymentMode,
          paymentDate: paymentData.paymentDate,
          bankAccountId: paymentData.bankAccountId,
          chequeNumber: paymentData.chequeNumber,
          upiReference: paymentData.upiReference,
          paymentLinkId: paymentData.paymentLinkId,
          notes: paymentData.notes,
        }, tenantId);

        const [createdPayment] = await tx.insert(salesPayments).values(paymentInsert).returning();
        paymentsCreated.push(createdPayment);

        // Update invoice
        const newPaidAmount = parseFloat(invoice.paidAmount || '0') + allocation;
        const newUdhaaarAmount = parseFloat(invoice.udhaaarAmount || '0') - allocation;
        const invoiceTotalAmount = parseFloat(invoice.totalAmount);
        let newStatus = invoice.status;

        // Use epsilon threshold to handle floating-point precision issues
        const epsilon = 0.005; // Half a cent
        let newShortfallAmount = parseFloat(invoice.shortfallAmount || '0');
        
        if (Math.abs(newUdhaaarAmount) < epsilon) {
          // Check if there's a shortfall when marking as paid
          const calculatedShortfall = invoiceTotalAmount - newPaidAmount;
          if (calculatedShortfall > epsilon) {
            newShortfallAmount = calculatedShortfall;
            totalShortfallCreated += calculatedShortfall;
          }
          newStatus = 'Paid';
        } else if (newPaidAmount > 0) {
          newStatus = 'Partially Paid';
        } else {
          newStatus = 'Unpaid';
        }

        await tx.update(salesInvoices)
          .set({
            paidAmount: newPaidAmount.toFixed(2),
            udhaaarAmount: newUdhaaarAmount.toFixed(2),
            shortfallAmount: newShortfallAmount.toFixed(2),
            status: newStatus
          })
          .where(withTenant(salesInvoices, tenantId, eq(salesInvoices.id, invoice.id)));

        invoicesUpdated.push(invoice.id);
        remainingPaymentAmount -= allocation;
      }

      // Update retailer balance and udhaaarBalance
      const distributedPaymentAmount = distributedAmount - remainingPaymentAmount;
      const newRetailerBalance = parseFloat(retailer[0].balance || '0') - distributedPaymentAmount;
      const newUdhaaarBalance = Math.max(0, parseFloat(retailer[0].udhaaarBalance || '0') - distributedPaymentAmount);
      const newShortfallBalance = parseFloat(retailer[0].shortfallBalance || '0') + totalShortfallCreated;
      await tx.update(retailers)
        .set({ 
          balance: newRetailerBalance.toFixed(2),
          udhaaarBalance: newUdhaaarBalance.toFixed(2),
          shortfallBalance: newShortfallBalance.toFixed(2)
        })
        .where(withTenant(retailers, tenantId, eq(retailers.id, retailerId)));

      // Create cashbook/bankbook entry
      if (paymentsCreated.length > 0) {
        if (paymentData.paymentMode === 'Cash') {
          // Get current cashbook balance
          const lastCashEntry = await tx.select().from(cashbook)
            .where(withTenant(cashbook, tenantId))
            .orderBy(desc(cashbook.createdAt))
            .limit(1);

          const currentBalance = lastCashEntry.length > 0 ? parseFloat(lastCashEntry[0].balance) : 0;
          const newBalance = currentBalance + (distributedAmount - remainingPaymentAmount);

          await tx.insert(cashbook).values(ensureTenantInsert({
            date: paymentData.paymentDate,
            description: `Retailer Payment - ${retailer[0].name}`,
            inflow: (distributedAmount - remainingPaymentAmount).toFixed(2),
            outflow: '0.00',
            balance: newBalance.toFixed(2),
            referenceType: 'Sales Payment',
            referenceId: paymentsCreated[0].id,
          }, tenantId));
        } else if (paymentData.paymentMode === 'Bank' && paymentData.bankAccountId) {
          // Get current bank balance
          const lastBankEntry = await tx.select().from(bankbook)
            .where(withTenant(bankbook, tenantId, eq(bankbook.bankAccountId, paymentData.bankAccountId)))
            .orderBy(desc(bankbook.createdAt))
            .limit(1);

          const currentBalance = lastBankEntry.length > 0 ? parseFloat(lastBankEntry[0].balance) : 0;
          const newBalance = currentBalance + (distributedAmount - remainingPaymentAmount);

          await tx.insert(bankbook).values(ensureTenantInsert({
            bankAccountId: paymentData.bankAccountId,
            date: paymentData.paymentDate,
            description: `Retailer Payment - ${retailer[0].name}`,
            debit: (distributedAmount - remainingPaymentAmount).toFixed(2),
            credit: '0.00',
            balance: newBalance.toFixed(2),
            referenceType: 'Sales Payment',
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
        retailerBalanceAfter: newRetailerBalance.toFixed(2),
      };
    });
  }

  async getOutstandingInvoicesForRetailer(tenantId: string, retailerId: string): Promise<SalesInvoice[]> {
    return await db.select().from(salesInvoices)
      .where(withTenant(salesInvoices, tenantId, and(
        eq(salesInvoices.retailerId, retailerId),
        or(
          eq(salesInvoices.status, 'Unpaid'),
          eq(salesInvoices.status, 'Partially Paid')
        ),
        gt(salesInvoices.udhaaarAmount, '0')
      )))
      .orderBy(asc(salesInvoices.invoiceDate));
  }
}