import { eq, desc, and, inArray, or, gt, asc } from 'drizzle-orm';
import { db } from '../../../db';
import { salesPayments, salesInvoices, retailers, bankAccounts, cashbook, bankbook, type SalesPayment, type InsertSalesPayment, type SalesPaymentWithDetails, type SalesInvoice, type RetailerPaymentDistributionResult } from '@shared/schema';
import { withTenant, ensureTenantInsert } from '../../utils/tenant-scope';
import { BankAccountModel } from '../bank-accounts/model';
import { TenantModel } from '../tenants/model';

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
          bankAccount: payment.bankAccountId ? (bankAccountMap.get(payment.bankAccountId) || null) : null
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
          bankAccount: payment.bankAccountId ? (bankAccountMap.get(payment.bankAccountId) || null) : null
        };
      })
      .filter(payment => payment !== null) as SalesPaymentWithDetails[];

    return result;
  }

  async createSalesPayment(tenantId: string, paymentData: InsertSalesPayment): Promise<SalesPaymentWithDetails> {
    // Validate bankAccountId for non-cash payments
    if (['Bank', 'UPI', 'Cheque'].includes(paymentData.paymentMode) && !paymentData.bankAccountId) {
      throw new Error('bankAccountId is required for non-cash payments');
    }
    
    return await db.transaction(async (tx) => {
      const paymentWithTenant = ensureTenantInsert(paymentData, tenantId);
      const [payment] = await tx.insert(salesPayments).values(paymentWithTenant).returning();

      // Fetch and validate related entities with tenant filtering
      const [invoice] = await tx.select().from(salesInvoices)
        .where(withTenant(salesInvoices, tenantId, eq(salesInvoices.id, payment.invoiceId)));
      
      const [retailer] = await tx.select().from(retailers)
        .where(withTenant(retailers, tenantId, eq(retailers.id, payment.retailerId)));

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (!retailer) {
        throw new Error('Retailer not found');
      }

      // Update invoice amounts and status
      const paymentAmount = parseFloat(payment.amount);
      const currentPaidAmount = parseFloat(invoice.paidAmount || '0');
      const totalAmount = parseFloat(invoice.totalAmount);
      const newPaidAmount = currentPaidAmount + paymentAmount;
      const newUdhaaarAmount = totalAmount - newPaidAmount;
      
      // Calculate shortfall using corrected logic
      let shortfallAmount = 0;
      const epsilon = 0.005;
      let newStatus = 'Unpaid';
      
      if (Math.abs(newUdhaaarAmount) < epsilon) {
        newStatus = 'Paid';
        const calculatedShortfall = totalAmount - newPaidAmount;
        if (calculatedShortfall > epsilon) {
          shortfallAmount = calculatedShortfall;
        }
      } else if (newPaidAmount > epsilon) {
        newStatus = 'Partially Paid';
      }
      
      const prevShortfall = parseFloat(invoice.shortfallAmount || '0');
      let newShortfallAmount = prevShortfall;
      if (shortfallAmount > epsilon) {
        newShortfallAmount = shortfallAmount;
      }
      
      await tx.update(salesInvoices)
        .set({
          paidAmount: newPaidAmount.toFixed(2),
          udhaaarAmount: Math.max(0, newUdhaaarAmount).toFixed(2),
          shortfallAmount: newShortfallAmount.toFixed(2),
          status: newStatus
        })
        .where(withTenant(salesInvoices, tenantId, eq(salesInvoices.id, payment.invoiceId)));
      
      // Update retailer balances
      const currentRetailerBalance = parseFloat(retailer.balance || '0');
      const currentUdhaaarBalance = parseFloat(retailer.udhaaarBalance || '0');
      const currentShortfallBalance = parseFloat(retailer.shortfallBalance || '0');
      
      const newRetailerBalance = currentRetailerBalance - paymentAmount;
      const newUdhaaarBalance = Math.max(0, currentUdhaaarBalance - paymentAmount);
      const newShortfallBalance = currentShortfallBalance + shortfallAmount;
      
      await tx.update(retailers)
        .set({ 
          balance: newRetailerBalance.toFixed(2),
          udhaaarBalance: newUdhaaarBalance.toFixed(2),
          shortfallBalance: newShortfallBalance.toFixed(2)
        })
        .where(withTenant(retailers, tenantId, eq(retailers.id, payment.retailerId)));
      
      // Create cashbook entry for Cash payments
      if (payment.paymentMode === 'Cash') {
        const lastCashEntry = await tx.select().from(cashbook)
          .where(withTenant(cashbook, tenantId))
          .orderBy(desc(cashbook.id))
          .limit(1)
          .for('update');

        const currentBalance = lastCashEntry.length > 0 ? parseFloat(lastCashEntry[0].balance) : 0;
        const newBalance = currentBalance + paymentAmount;

        await tx.insert(cashbook).values(ensureTenantInsert({
          date: payment.paymentDate,
          description: `Retailer Payment - ${retailer.name}`,
          inflow: paymentAmount.toFixed(2),
          outflow: '0.00',
          balance: newBalance.toFixed(2),
          referenceType: 'Sales Payment',
          referenceId: payment.id,
        }, tenantId));

        // Update tenant cash balance
        await TenantModel.setCashBalance(tx, tenantId, newBalance.toFixed(2));
      }
      
      // Create bankbook entry for Bank/UPI/Cheque payments
      else if ((payment.paymentMode === 'Bank' || payment.paymentMode === 'UPI' || payment.paymentMode === 'Cheque') && payment.bankAccountId) {
        const lastBankEntry = await tx.select().from(bankbook)
          .where(withTenant(bankbook, tenantId, eq(bankbook.bankAccountId, payment.bankAccountId)))
          .orderBy(desc(bankbook.id))
          .limit(1)
          .for('update');

        const currentBalance = lastBankEntry.length > 0 ? parseFloat(lastBankEntry[0].balance) : 0;
        const newBalance = currentBalance + paymentAmount;

        await tx.insert(bankbook).values(ensureTenantInsert({
          bankAccountId: payment.bankAccountId,
          date: payment.paymentDate,
          description: `Retailer Payment - ${retailer.name}`,
          debit: paymentAmount.toFixed(2),
          credit: '0.00',
          balance: newBalance.toFixed(2),
          referenceType: 'Sales Payment',
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
      const updatedInvoice = {
        ...invoice,
        paidAmount: newPaidAmount.toFixed(2),
        udhaaarAmount: Math.max(0, newUdhaaarAmount).toFixed(2),
        shortfallAmount: newShortfallAmount.toFixed(2),
        status: newStatus,
      };
      
      return {
        ...payment,
        invoice: updatedInvoice,
        retailer,
        bankAccount: bankAccount || undefined
      };
    });
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
            .orderBy(desc(cashbook.id))
            .limit(1)
            .for('update');

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

          // Update tenant cash balance
          await TenantModel.setCashBalance(tx, tenantId, newBalance.toFixed(2));
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