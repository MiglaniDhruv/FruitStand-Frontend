import { eq, desc, inArray, and, or, gt, asc } from 'drizzle-orm';
import { db } from '../../../db';
import { payments, purchaseInvoices, vendors, bankAccounts, cashbook, bankbook, type Payment, type InsertPayment, type PaymentWithDetails, type PurchaseInvoice, type VendorPaymentDistributionResult } from '@shared/schema';
import { withTenant, ensureTenantInsert } from '../../utils/tenant-scope';
import { BankAccountModel } from '../bank-accounts/model';
import { TenantModel } from '../tenants/model';

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
          bankAccount: payment.bankAccountId ? bankAccountMap.get(payment.bankAccountId) : undefined
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
          bankAccount: payment.bankAccountId ? bankAccountMap.get(payment.bankAccountId) : undefined
        };
      })
      .filter(payment => payment !== null) as PaymentWithDetails[];

    return result;
  }

  async createPayment(tenantId: string, paymentData: InsertPayment): Promise<PaymentWithDetails> {
    // Validate bankAccountId for non-cash payments
    if (['Bank', 'UPI', 'Cheque'].includes(paymentData.paymentMode) && !paymentData.bankAccountId) {
      throw new Error('bankAccountId is required for non-cash payments');
    }
    
    return await db.transaction(async (tx) => {
      const paymentWithTenant = ensureTenantInsert(paymentData, tenantId);
      const [payment] = await tx.insert(payments).values(paymentWithTenant).returning();
      
      // Fetch and validate related entities with tenant filtering
      const [invoice] = await tx.select().from(purchaseInvoices)
        .where(withTenant(purchaseInvoices, tenantId, eq(purchaseInvoices.id, payment.invoiceId)));
      
      const [vendor] = await tx.select().from(vendors)
        .where(withTenant(vendors, tenantId, eq(vendors.id, payment.vendorId)));
      
      if (!invoice) {
        throw new Error('Payment invoice not found');
      }
      
      if (!vendor) {
        throw new Error('Payment vendor not found');
      }
      
      // Update invoice amounts and status with overpayment protection
      const paymentAmount = parseFloat(payment.amount);
      const currentPaidAmount = parseFloat(invoice.paidAmount || '0');
      const totalAmount = parseFloat(invoice.netAmount);
      const currentInvoiceBalance = totalAmount - currentPaidAmount;
      const appliedAmount = Math.min(paymentAmount, currentInvoiceBalance);
      
      const newPaidAmount = currentPaidAmount + appliedAmount;
      const newBalanceAmount = Math.max(0, totalAmount - newPaidAmount);
      
      // Determine status using epsilon threshold for floating-point precision
      const epsilon = 0.005;
      let newStatus = 'Unpaid';
      if (newBalanceAmount <= epsilon) {
        newStatus = 'Paid';
      } else if (newPaidAmount > epsilon) {
        newStatus = 'Partially Paid';
      }
      
      await tx.update(purchaseInvoices)
        .set({
          paidAmount: newPaidAmount.toFixed(2),
          balanceAmount: newBalanceAmount.toFixed(2),
          status: newStatus
        })
        .where(withTenant(purchaseInvoices, tenantId, eq(purchaseInvoices.id, payment.invoiceId)));
      
      // Update vendor balance using applied amount
      const currentVendorBalance = parseFloat(vendor.balance || '0');
      const newVendorBalance = currentVendorBalance - appliedAmount;
      await tx.update(vendors)
        .set({ balance: newVendorBalance.toFixed(2) })
        .where(withTenant(vendors, tenantId, eq(vendors.id, payment.vendorId)));
      
      // Create cashbook entry for Cash payments using applied amount
      if (payment.paymentMode === 'Cash') {
        const lastCashEntry = await tx.select().from(cashbook)
          .where(withTenant(cashbook, tenantId))
          .orderBy(desc(cashbook.id))
          .limit(1)
          .for('update');

        const currentBalance = lastCashEntry.length > 0 ? parseFloat(lastCashEntry[0].balance) : 0;
        const newBalance = currentBalance - appliedAmount;

        await tx.insert(cashbook).values(ensureTenantInsert({
          date: payment.paymentDate,
          description: `Vendor Payment - ${vendor.name}`,
          outflow: appliedAmount.toFixed(2),
          inflow: '0.00',
          balance: newBalance.toFixed(2),
          referenceType: 'Payment',
          referenceId: payment.id,
        }, tenantId));

        // Update tenant cash balance
        await TenantModel.setCashBalance(tx, tenantId, newBalance.toFixed(2));
      }
      
      // Create bankbook entry for Bank/UPI/Cheque payments using applied amount
      else if ((payment.paymentMode === 'Bank' || payment.paymentMode === 'UPI' || payment.paymentMode === 'Cheque') && payment.bankAccountId) {
        const lastBankEntry = await tx.select().from(bankbook)
          .where(withTenant(bankbook, tenantId, eq(bankbook.bankAccountId, payment.bankAccountId)))
          .orderBy(desc(bankbook.id))
          .limit(1)
          .for('update');

        const currentBalance = lastBankEntry.length > 0 ? parseFloat(lastBankEntry[0].balance) : 0;
        const newBalance = currentBalance - appliedAmount;

        await tx.insert(bankbook).values(ensureTenantInsert({
          bankAccountId: payment.bankAccountId,
          date: payment.paymentDate,
          description: `Vendor Payment - ${vendor.name}`,
          credit: appliedAmount.toFixed(2),
          debit: '0.00',
          balance: newBalance.toFixed(2),
          referenceType: 'Payment',
          referenceId: payment.id,
        }, tenantId));

        // Update bank account balance
        await BankAccountModel.setBankAccountBalance(tx, tenantId, payment.bankAccountId, newBalance.toFixed(2));
      }
      
      // Fetch bank account data for response
      let bankAccount = null;
      if (payment.bankAccountId) {
        const [bankAccountData] = await tx.select().from(bankAccounts)
          .where(withTenant(bankAccounts, tenantId, eq(bankAccounts.id, payment.bankAccountId)));
        bankAccount = bankAccountData || null;
      }
      
      // Return payment with related data
      const updatedInvoice = { ...invoice, paidAmount: newPaidAmount.toFixed(2), balanceAmount: newBalanceAmount.toFixed(2), status: newStatus };
      
      return {
        ...payment,
        invoice: updatedInvoice,
        vendor,
        bankAccount: bankAccount || undefined
      };
    });
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
            .orderBy(desc(cashbook.id))
            .limit(1)
            .for('update');

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

          // Update tenant cash balance
          await TenantModel.setCashBalance(tx, tenantId, newBalance.toFixed(2));
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

          // Align bank account balance with bankbook running balance
          await BankAccountModel.setBankAccountBalance(tx, tenantId, paymentData.bankAccountId, newBalance.toFixed(2));
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