import { eq, desc, asc, and, or } from 'drizzle-orm';
import { db } from '../../../db';
import { 
  cashbook, 
  bankbook, 
  purchaseInvoices, 
  payments, 
  salesInvoices, 
  salesPayments, 
  crateTransactions, 
  retailers, 
  vendors,
  type CashbookEntry, 
  type BankbookEntry,
  type VendorLedgerEntry,
  type RetailerLedgerEntry,
  type UdhaaarBookEntry,
  type CrateLedgerEntry
} from '@shared/schema';
import { withTenant } from '../../utils/tenant-scope';

export class LedgerModel {
  async getCashbook(tenantId: string): Promise<CashbookEntry[]> {
    return await db.select().from(cashbook)
      .where(withTenant(cashbook, tenantId))
      .orderBy(desc(cashbook.date));
  }

  async getBankbook(tenantId: string, bankAccountId?: string): Promise<BankbookEntry[]> {
    if (bankAccountId) {
      return await db.select().from(bankbook)
        .where(withTenant(bankbook, tenantId, eq(bankbook.bankAccountId, bankAccountId)))
        .orderBy(desc(bankbook.date));
    }
    
    return await db.select().from(bankbook)
      .where(withTenant(bankbook, tenantId))
      .orderBy(desc(bankbook.date));
  }

  async getVendorLedger(tenantId: string, vendorId: string): Promise<VendorLedgerEntry[]> {
    // Fetch all purchase invoices for the vendor with tenant filtering
    const invoices = await db.select().from(purchaseInvoices)
      .where(withTenant(purchaseInvoices, tenantId, eq(purchaseInvoices.vendorId, vendorId)));

    // Fetch all payments for the vendor with tenant filtering
    const vendorPayments = await db.select().from(payments)
      .where(withTenant(payments, tenantId, eq(payments.vendorId, vendorId)));

    // Normalize all entries into a single array
    const allEntries: (VendorLedgerEntry & { typeOrder: number })[] = [];

    // Add invoice entries (debit - increases vendor balance)
    for (const invoice of invoices) {
      allEntries.push({
        tenantId,
        date: invoice.invoiceDate,
        description: `Invoice ${invoice.invoiceNumber}`,
        referenceType: 'Invoice' as const,
        referenceId: invoice.id,
        debit: Number(invoice.netAmount || '0'),
        credit: 0,
        balance: 0, // Will be computed after sorting
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        createdAt: invoice.createdAt,
        typeOrder: 1 // Invoice comes before Payment for same date
      });
    }

    // Add payment entries (credit - decreases vendor balance)
    for (const payment of vendorPayments) {
      allEntries.push({
        tenantId,
        date: payment.paymentDate,
        description: `Payment - ${payment.paymentMode}`,
        referenceType: 'Payment' as const,
        referenceId: payment.id,
        debit: 0,
        credit: Number(payment.amount || '0'),
        balance: 0, // Will be computed after sorting
        paymentMode: payment.paymentMode,
        notes: payment.notes,
        createdAt: payment.createdAt,
        typeOrder: 2 // Payment comes after Invoice for same date
      });
    }

    // Sort chronologically with stable tie-breakers
    allEntries.sort((a, b) => {
      // First by date
      const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      
      // Then by createdAt if available
      if (a.createdAt && b.createdAt) {
        const createdAtCompare = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (createdAtCompare !== 0) return createdAtCompare;
      }
      
      // Finally by type order (Invoice < Payment)
      return a.typeOrder - b.typeOrder;
    });

    // Compute running balances in single pass
    let runningBalance = 0;
    const ledgerEntries: VendorLedgerEntry[] = allEntries.map(entry => {
      runningBalance += (entry.debit - entry.credit);
      const { typeOrder, ...ledgerEntry } = entry; // Remove typeOrder from final result
      return {
        ...ledgerEntry,
        balance: runningBalance
      };
    });

    return ledgerEntries;
  }

  async getRetailerLedger(tenantId: string, retailerId: string): Promise<RetailerLedgerEntry[]> {
    // Fetch all sales invoices for the retailer with tenant filtering
    const invoices = await db.select().from(salesInvoices)
      .where(withTenant(salesInvoices, tenantId, eq(salesInvoices.retailerId, retailerId)));

    // Fetch all sales payments for the retailer with tenant filtering
    const retailerPayments = await db.select().from(salesPayments)
      .where(withTenant(salesPayments, tenantId, eq(salesPayments.retailerId, retailerId)));

    // Fetch all crate transactions for the retailer with tenant filtering  
    const crateTransactionsList = await db.select().from(crateTransactions)
      .where(withTenant(crateTransactions, tenantId, eq(crateTransactions.retailerId, retailerId)));

    // Normalize all entries into a single array
    const allEntries: (RetailerLedgerEntry & { typeOrder: number, crateQuantityDelta: number })[] = [];

    // Add invoice entries (debit - increases retailer balance owed to us)
    for (const invoice of invoices) {
      allEntries.push({
        tenantId,
        date: invoice.invoiceDate,
        description: `Sales Invoice ${invoice.invoiceNumber}`,
        referenceType: 'Sales Invoice' as const,
        referenceId: invoice.id,
        debit: Number(invoice.totalAmount || '0'), // Use totalAmount matching the debit display
        credit: 0,
        balance: 0, // Will be computed after sorting
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        createdAt: invoice.createdAt,
        typeOrder: 1, // Invoice comes first for same date
        crateQuantityDelta: 0 // No crate impact
      });
    }

    // Add payment entries (credit - decreases retailer balance)
    for (const payment of retailerPayments) {
      allEntries.push({
        tenantId,
        date: payment.paymentDate,
        description: `Payment Received - ${payment.paymentMode}`,
        referenceType: 'Sales Payment' as const,  
        referenceId: payment.id,
        debit: 0,
        credit: Number(payment.amount || '0'),
        balance: 0, // Will be computed after sorting
        paymentMode: payment.paymentMode,
        notes: payment.notes,
        createdAt: payment.createdAt,
        typeOrder: 2, // Payment comes after Invoice for same date
        crateQuantityDelta: 0 // No crate impact
      });
    }

    // Add crate transaction entries - Option A: Include deposit amounts in monetary ledger
    for (const crateTransaction of crateTransactionsList) {
      const isIssue = crateTransaction.transactionType === 'Issue';
      const depositAmount = Number(crateTransaction.depositAmount || '0');
      
      allEntries.push({
        tenantId,
        date: crateTransaction.transactionDate,
        description: `Crates ${crateTransaction.transactionType} - Qty: ${crateTransaction.quantity}`,
        referenceType: 'Crate Transaction' as const,
        referenceId: crateTransaction.id,
        debit: isIssue ? depositAmount : 0, // Issue = we give crates, customer owes deposit
        credit: isIssue ? 0 : depositAmount, // Return = customer returns crates, we refund deposit
        balance: 0, // Will be computed after sorting
        transactionType: crateTransaction.transactionType,
        quantity: crateTransaction.quantity,
        notes: crateTransaction.notes,
        createdAt: crateTransaction.createdAt,
        typeOrder: 3, // Crate comes after Payment for same date
        crateQuantityDelta: isIssue ? crateTransaction.quantity : -crateTransaction.quantity
      });
    }

    // Sort chronologically with stable tie-breakers
    allEntries.sort((a, b) => {
      // First by date
      const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      
      // Then by createdAt if available
      if (a.createdAt && b.createdAt) {
        const createdAtCompare = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (createdAtCompare !== 0) return createdAtCompare;
      }
      
      // Finally by type order (Invoice < Payment < Crate)
      return a.typeOrder - b.typeOrder;
    });

    // Compute running balances in single pass
    let runningBalance = 0;
    let crateBalance = 0;
    
    const ledgerEntries: RetailerLedgerEntry[] = allEntries.map(entry => {
      // Update monetary running balance
      runningBalance += (entry.debit - entry.credit);
      
      // Update crate balance
      crateBalance += entry.crateQuantityDelta;
      
      const { typeOrder, crateQuantityDelta, ...ledgerEntry } = entry; // Remove helper fields
      return {
        ...ledgerEntry,
        balance: runningBalance,
        crateBalance: entry.referenceType === 'Crate Transaction' ? crateBalance : undefined
      };
    });

    return ledgerEntries;
  }

  async getUdhaaarBook(tenantId: string): Promise<UdhaaarBookEntry[]> {
    // Get all active retailers with tenant filtering
    const allRetailers = await db.select().from(retailers)
      .where(withTenant(retailers, tenantId, eq(retailers.isActive, true)))
      .orderBy(asc(retailers.name));

    // Filter retailers with non-zero udhaar balance
    const udhaaarEntries = allRetailers
      .filter(retailer => {
        const balance = parseFloat(retailer.udhaaarBalance || '0');
        return balance !== 0;
      })
      .map(retailer => ({
        tenantId,
        retailerId: retailer.id,
        retailerName: retailer.name,
        contactPerson: retailer.contactPerson,
        phone: retailer.phone,
        address: retailer.address,
        udhaaarBalance: parseFloat(retailer.udhaaarBalance || '0'),
        totalBalance: parseFloat(retailer.balance || '0'),
        shortfallBalance: parseFloat(retailer.shortfallBalance || '0'),
        crateBalance: retailer.crateBalance || 0,
        isActive: retailer.isActive,
        createdAt: retailer.createdAt
      }));

    return udhaaarEntries;
  }

  async getCrateLedger(tenantId: string, retailerId?: string): Promise<CrateLedgerEntry[]> {
    const baseQuery = db.select({
      id: crateTransactions.id,
      retailerId: crateTransactions.retailerId,
      retailerName: retailers.name,
      contactPerson: retailers.contactPerson,
      phone: retailers.phone,
      transactionType: crateTransactions.transactionType,
      quantity: crateTransactions.quantity,
      depositAmount: crateTransactions.depositAmount,
      transactionDate: crateTransactions.transactionDate,
      notes: crateTransactions.notes,
      createdAt: crateTransactions.createdAt
    })
    .from(crateTransactions)
    .leftJoin(retailers, eq(crateTransactions.retailerId, retailers.id));

    const transactions = retailerId 
      ? await baseQuery.where(and(
          withTenant(crateTransactions, tenantId),
          withTenant(retailers, tenantId),
          eq(crateTransactions.retailerId, retailerId)
        )).orderBy(asc(crateTransactions.transactionDate))
      : await baseQuery.where(and(
          withTenant(crateTransactions, tenantId),
          withTenant(retailers, tenantId)
        )).orderBy(asc(crateTransactions.transactionDate));

    // Calculate running crate balance for each retailer
    const retailerBalances = new Map<string, number>();
    
    const ledgerEntries: CrateLedgerEntry[] = transactions.map(transaction => {
      const currentBalance = retailerBalances.get(transaction.retailerId) || 0;
      let newBalance = currentBalance;

      if (transaction.transactionType === 'Issue') {
        newBalance = currentBalance + transaction.quantity;
      } else if (transaction.transactionType === 'Return') {
        newBalance = currentBalance - transaction.quantity;
      }

      retailerBalances.set(transaction.retailerId, newBalance);

      return {
        tenantId,
        id: transaction.id,
        retailerId: transaction.retailerId,
        retailerName: transaction.retailerName,
        contactPerson: transaction.contactPerson,
        phone: transaction.phone,
        transactionType: transaction.transactionType,
        quantity: transaction.quantity,
        depositAmount: Number(transaction.depositAmount || '0'),
        transactionDate: transaction.transactionDate,
        notes: transaction.notes,
        runningBalance: newBalance,
        createdAt: transaction.createdAt
      };
    });

    return ledgerEntries;
  }

  // Helper methods for validation
  async getVendorById(tenantId: string, vendorId: string): Promise<any> {
    const [vendor] = await db.select().from(vendors)
      .where(withTenant(vendors, tenantId, eq(vendors.id, vendorId)));
    return vendor;
  }

  async getRetailerById(tenantId: string, retailerId: string): Promise<any> {
    const [retailer] = await db.select().from(retailers)
      .where(withTenant(retailers, tenantId, eq(retailers.id, retailerId)));
    return retailer;
  }
}