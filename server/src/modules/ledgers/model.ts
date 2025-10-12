import { eq, desc, asc, and, or, gte, lte, lt, sql } from 'drizzle-orm';
import { db } from '../../../db';
import { TenantModel } from '../tenants/model';
import { BankAccountModel } from '../bank-accounts/model';
import { 
  cashbook, 
  bankbook, 
  bankAccounts,
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
import { withTenant, ensureTenantInsert } from '../../utils/tenant-scope';

export class LedgerModel {
  async getCashbook(tenantId: string, fromDate?: string, toDate?: string): Promise<any[]> {
    // Get prior balance if fromDate is specified
    let runningBalance = 0;
    if (fromDate) {
      const priorConditions = [withTenant(cashbook, tenantId), lt(cashbook.date, new Date(fromDate))];
      const priorWhereExpr = priorConditions.length > 1 ? and(...priorConditions) : priorConditions[0];
      
      const [{ priorIn = 0, priorOut = 0 } = {}] = await db.select({
        priorIn: sql<number>`coalesce(sum(${cashbook.inflow}::numeric),0)`,
        priorOut: sql<number>`coalesce(sum(${cashbook.outflow}::numeric),0)`
      }).from(cashbook).where(priorWhereExpr);
      
      runningBalance = Number(priorIn) - Number(priorOut);
    }
    
    // Build where conditions for main query
    const conditions = [withTenant(cashbook, tenantId)];
    
    if (fromDate) {
      conditions.push(gte(cashbook.date, new Date(fromDate)));
    }
    
    if (toDate) {
      conditions.push(lte(cashbook.date, new Date(toDate)));
    }
    
    // Fetch entries with date filtering
    const whereExpr = conditions.length > 1 ? and(...conditions) : conditions[0];
    const entries = await db.select().from(cashbook)
      .where(whereExpr)
      .orderBy(asc(cashbook.date), asc(cashbook.id));
    
    // Compute day-wise opening/closing balances
    const entriesWithBalance = [];
    let currentDate = '';
    
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      
      if (!entry.date) {
        continue;
      }
      
      let entryDate;
      try {
        const dateObj = new Date(entry.date);
        if (isNaN(dateObj.getTime())) {
          continue;
        }
        entryDate = dateObj.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      } catch (error) {
        continue;
      }
      
      // Add closing balance for previous day and opening balance for new day
      if (entryDate !== currentDate) {
        if (currentDate !== '') {
          // Add closing balance for previous day
          entriesWithBalance.push({
            date: new Date(currentDate).toISOString(),
            description: 'Day Closing Balance',
            debit: 0,
            credit: 0,
            balance: runningBalance,
            referenceType: 'Balance',
            type: 'Closing',
            isBalanceEntry: true
          });
        }
        
        currentDate = entryDate;
        
        // Add opening balance for new day
        entriesWithBalance.push({
          date: new Date(entryDate).toISOString(),
          description: 'Day Opening Balance',
          debit: 0,
          credit: 0,
          balance: runningBalance,
          referenceType: 'Balance',
          type: 'Opening',
          isBalanceEntry: true
        });
      }
      
      // Calculate new balance
      runningBalance += parseFloat(entry.inflow || '0') - parseFloat(entry.outflow || '0');
      
      // Add actual entry with computed balance
      const { inflow, outflow, ...rest } = entry as any;
      entriesWithBalance.push({
        ...rest,
        date: new Date(entry.date).toISOString(),
        debit: parseFloat(inflow || '0'),
        credit: parseFloat(outflow || '0'),
        balance: runningBalance,
        isBalanceEntry: false,
      });
    }
    
    // Add final closing balance if there were entries
    if (currentDate !== '') {
      entriesWithBalance.push({
        date: new Date(currentDate).toISOString(),
        description: 'Day Closing Balance',
        debit: 0,
        credit: 0,
        balance: runningBalance,
        referenceType: 'Balance',
        type: 'Closing',
        isBalanceEntry: true
      });
    }
    
    return entriesWithBalance;
  }

  async getLatestCashbookEntry(tenantId: string): Promise<CashbookEntry | null> {
    const [latestEntry] = await db.select().from(cashbook)
      .where(withTenant(cashbook, tenantId))
      .orderBy(desc(cashbook.createdAt), desc(cashbook.id))
      .limit(1);
    return latestEntry || null;
  }

  static async initializeCashbook(tenantId: string, initialBalance: number): Promise<boolean> {
    try {
      return await db.transaction(async (tx) => {
        const existing = await tx.select().from(cashbook)
          .where(withTenant(cashbook, tenantId))
          .limit(1);
        if (existing.length > 0 || initialBalance <= 0) return false;
        await tx.insert(cashbook).values(ensureTenantInsert({
          date: new Date(), description: 'Opening Balance', inflow: initialBalance.toFixed(2), outflow: '0.00', balance: initialBalance.toFixed(2), referenceType: 'Opening Balance', referenceId: null,
        }, tenantId));
        
        // Initialize cash balance in tenant settings
        await TenantModel.setCashBalance(tx, tenantId, initialBalance.toFixed(2));
        return true;
      });
    } catch (error) {
      console.error('Error initializing cashbook:', error);
      return false;
    }
  }

  async getBankbook(tenantId: string, bankAccountId: string, fromDate?: string, toDate?: string): Promise<any[]> {
    // Get prior balance if fromDate is specified
    let runningBalance = 0;
    if (fromDate) {
      const priorConditions = [
        withTenant(bankbook, tenantId),
        eq(bankbook.bankAccountId, bankAccountId),
        lt(bankbook.date, new Date(fromDate))
      ];
      const priorWhereExpr = priorConditions.length > 1 ? and(...priorConditions) : priorConditions[0];
      
      const [{ priorDebit = 0, priorCredit = 0 } = {}] = await db.select({
        priorDebit: sql<number>`coalesce(sum(${bankbook.debit}::numeric),0)`,
        priorCredit: sql<number>`coalesce(sum(${bankbook.credit}::numeric),0)`
      }).from(bankbook).where(priorWhereExpr);
      
      runningBalance = Number(priorDebit) - Number(priorCredit);
    }
    
    // Build where conditions for main query
    const conditions = [
      withTenant(bankbook, tenantId),
      eq(bankbook.bankAccountId, bankAccountId)
    ];
    
    if (fromDate) {
      conditions.push(gte(bankbook.date, new Date(fromDate)));
    }
    
    if (toDate) {
      conditions.push(lte(bankbook.date, new Date(toDate)));
    }
    
    // Fetch entries with filtering
    const whereExpr = conditions.length > 1 ? and(...conditions) : conditions[0];
    const entries = await db.select().from(bankbook)
      .where(whereExpr)
      .orderBy(asc(bankbook.date), asc(bankbook.id));
    
    // Compute day-wise opening/closing balances
    const entriesWithBalance = [];
    let currentDate = '';
    
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      
      if (!entry.date) {
        continue;
      }
      
      let entryDate;
      try {
        const dateObj = new Date(entry.date);
        if (isNaN(dateObj.getTime())) {
          continue;
        }
        entryDate = dateObj.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      } catch (error) {
        continue;
      }
      
      // Add closing balance for previous day and opening balance for new day
      if (entryDate !== currentDate) {
        if (currentDate !== '') {
          // Add closing balance for previous day
          entriesWithBalance.push({
            date: new Date(currentDate).toISOString(),
            description: 'Day Closing Balance',
            debit: 0,
            credit: 0,
            balance: runningBalance,
            referenceType: 'Balance',
            type: 'Closing',
            isBalanceEntry: true,
            bankAccountId: bankAccountId
          });
        }
        
        currentDate = entryDate;
        
        // Add opening balance for new day
        entriesWithBalance.push({
          date: new Date(entryDate).toISOString(),
          description: 'Day Opening Balance',
          debit: 0,
          credit: 0,
          balance: runningBalance,
          referenceType: 'Balance',
          type: 'Opening',
          isBalanceEntry: true,
          bankAccountId: bankAccountId
        });
      }
      
      // Calculate new balance
      runningBalance += parseFloat(entry.debit || '0') - parseFloat(entry.credit || '0');
      
      // Add actual entry with computed balance
      entriesWithBalance.push({
        ...entry,
        date: new Date(entry.date).toISOString(),
        debit: parseFloat(entry.debit || '0'),
        credit: parseFloat(entry.credit || '0'),
        balance: runningBalance,
        isBalanceEntry: false
      });
    }
    
    // Add final closing balance if there were entries
    if (currentDate !== '') {
      entriesWithBalance.push({
        date: new Date(currentDate).toISOString(),
        description: 'Day Closing Balance',
        debit: 0,
        credit: 0,
        balance: runningBalance,
        referenceType: 'Balance',
        type: 'Closing',
        isBalanceEntry: true,
        bankAccountId: bankAccountId
      });
    }
    
    return entriesWithBalance;
  }

  async getVendorLedger(tenantId: string, vendorId: string, fromDate?: string, toDate?: string): Promise<VendorLedgerEntry[]> {
    // Calculate carry-forward balance if fromDate is provided
    let carryForwardBalance = 0;
    if (fromDate) {
      // Get prior invoices
      const priorInvoices = await db.select().from(purchaseInvoices)
        .where(and(
          withTenant(purchaseInvoices, tenantId),
          eq(purchaseInvoices.vendorId, vendorId),
          lt(purchaseInvoices.invoiceDate, new Date(fromDate))
        ));
      
      // Get prior payments  
      const priorPayments = await db.select().from(payments)
        .where(and(
          withTenant(payments, tenantId),
          eq(payments.vendorId, vendorId),
          lt(payments.paymentDate, new Date(fromDate))
        ));
      
      // Calculate carry-forward balance
      const totalInvoices = priorInvoices.reduce((sum, inv) => sum + Number(inv.netAmount || '0'), 0);
      const totalPayments = priorPayments.reduce((sum, pay) => sum + Number(pay.amount || '0'), 0);
      carryForwardBalance = totalInvoices - totalPayments;
    }

    // Build conditions for invoices
    const invoiceConditions = [withTenant(purchaseInvoices, tenantId), eq(purchaseInvoices.vendorId, vendorId)];
    if (fromDate) {
      invoiceConditions.push(gte(purchaseInvoices.invoiceDate, new Date(fromDate)));
    }
    if (toDate) {
      const endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999);
      invoiceConditions.push(lte(purchaseInvoices.invoiceDate, endOfDay));
    }
    const invoiceWhereExpr = invoiceConditions.length > 1 ? and(...invoiceConditions) : invoiceConditions[0];
    
    // Fetch all purchase invoices for the vendor with tenant and date filtering
    const invoices = await db.select().from(purchaseInvoices)
      .where(invoiceWhereExpr);

    // Build conditions for payments
    const paymentConditions = [withTenant(payments, tenantId), eq(payments.vendorId, vendorId)];
    if (fromDate) {
      paymentConditions.push(gte(payments.paymentDate, new Date(fromDate)));
    }
    if (toDate) {
      const endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999);
      paymentConditions.push(lte(payments.paymentDate, endOfDay));
    }
    const paymentWhereExpr = paymentConditions.length > 1 ? and(...paymentConditions) : paymentConditions[0];

    // Fetch all payments for the vendor with tenant and date filtering
    const vendorPayments = await db.select().from(payments)
      .where(paymentWhereExpr);

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
    let runningBalance = carryForwardBalance;
    
    // Add opening balance entry if fromDate is provided and there's a carry-forward balance
    const ledgerEntries: VendorLedgerEntry[] = [];
    if (fromDate && carryForwardBalance !== 0) {
      ledgerEntries.push({
        tenantId,
        date: new Date(fromDate),
        description: 'Opening Balance',
        referenceType: 'Invoice' as const,
        referenceId: 'opening-balance',
        debit: carryForwardBalance > 0 ? carryForwardBalance : 0,
        credit: carryForwardBalance < 0 ? Math.abs(carryForwardBalance) : 0,
        balance: carryForwardBalance,
        createdAt: new Date()
      });
    }
    
    const mappedEntries: VendorLedgerEntry[] = allEntries.map(entry => {
      runningBalance += (entry.debit - entry.credit);
      const { typeOrder, ...ledgerEntry } = entry; // Remove typeOrder from final result
      return {
        ...ledgerEntry,
        balance: runningBalance
      };
    });

    ledgerEntries.push(...mappedEntries);
    return ledgerEntries;
  }

  async getRetailerLedger(tenantId: string, retailerId: string, fromDate?: string, toDate?: string): Promise<RetailerLedgerEntry[]> {
    // Calculate carry-forward balance if fromDate is provided
    let carryForwardBalance = 0;
    let carryForwardCrateBalance = 0;
    if (fromDate) {
      // Get prior sales invoices
      const priorInvoices = await db.select().from(salesInvoices)
        .where(and(
          withTenant(salesInvoices, tenantId),
          eq(salesInvoices.retailerId, retailerId),
          lt(salesInvoices.invoiceDate, new Date(fromDate))
        ));
      
      // Get prior sales payments  
      const priorPayments = await db.select().from(salesPayments)
        .where(and(
          withTenant(salesPayments, tenantId),
          eq(salesPayments.retailerId, retailerId),
          lt(salesPayments.paymentDate, new Date(fromDate))
        ));
      
      // Get prior crate transactions
      const priorCrateTransactions = await db.select().from(crateTransactions)
        .where(and(
          withTenant(crateTransactions, tenantId),
          eq(crateTransactions.retailerId, retailerId),
          lt(crateTransactions.transactionDate, new Date(fromDate))
        ));
      
      // Calculate carry-forward balances
      const totalInvoices = priorInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount || '0'), 0);
      const totalPayments = priorPayments.reduce((sum, pay) => sum + Number(pay.amount || '0'), 0);
      carryForwardBalance = totalInvoices - totalPayments;
      
      carryForwardCrateBalance = priorCrateTransactions.reduce((sum, trans) => {
        return sum + (trans.transactionType === 'Given' ? trans.quantity : -trans.quantity);
      }, 0);
    }

    // Build conditions for sales invoices
    const invoiceConditions = [withTenant(salesInvoices, tenantId), eq(salesInvoices.retailerId, retailerId)];
    if (fromDate) {
      invoiceConditions.push(gte(salesInvoices.invoiceDate, new Date(fromDate)));
    }
    if (toDate) {
      const endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999);
      invoiceConditions.push(lte(salesInvoices.invoiceDate, endOfDay));
    }
    const invoiceWhereExpr = invoiceConditions.length > 1 ? and(...invoiceConditions) : invoiceConditions[0];

    // Fetch all sales invoices for the retailer with tenant and date filtering
    const invoices = await db.select().from(salesInvoices)
      .where(invoiceWhereExpr);

    // Build conditions for sales payments
    const paymentConditions = [withTenant(salesPayments, tenantId), eq(salesPayments.retailerId, retailerId)];
    if (fromDate) {
      paymentConditions.push(gte(salesPayments.paymentDate, new Date(fromDate)));
    }
    if (toDate) {
      const endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999);
      paymentConditions.push(lte(salesPayments.paymentDate, endOfDay));
    }
    const paymentWhereExpr = paymentConditions.length > 1 ? and(...paymentConditions) : paymentConditions[0];

    // Fetch all sales payments for the retailer with tenant and date filtering
    const retailerPayments = await db.select().from(salesPayments)
      .where(paymentWhereExpr);

    // Build conditions for crate transactions
    const crateConditions = [withTenant(crateTransactions, tenantId), eq(crateTransactions.retailerId, retailerId)];
    if (fromDate) {
      crateConditions.push(gte(crateTransactions.transactionDate, new Date(fromDate)));
    }
    if (toDate) {
      const endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999);
      crateConditions.push(lte(crateTransactions.transactionDate, endOfDay));
    }
    const crateWhereExpr = crateConditions.length > 1 ? and(...crateConditions) : crateConditions[0];

    // Fetch all crate transactions for the retailer with tenant and date filtering  
    const crateTransactionsList = await db.select().from(crateTransactions)
      .where(crateWhereExpr);

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

    // Add crate transaction entries - Note: No monetary impact since depositAmount field doesn't exist
    for (const crateTransaction of crateTransactionsList) {
      const isIssue = crateTransaction.transactionType === 'Given';
      
      allEntries.push({
        tenantId,
        date: crateTransaction.transactionDate,
        description: `Crates ${crateTransaction.transactionType} - Qty: ${crateTransaction.quantity}`,
        referenceType: 'Crate Transaction' as const,
        referenceId: crateTransaction.id,
        debit: 0, // No monetary impact since no depositAmount field
        credit: 0, // No monetary impact since no depositAmount field
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
    let runningBalance = carryForwardBalance;
    let crateBalance = carryForwardCrateBalance;
    
    // Add opening balance entries if fromDate is provided and there are carry-forward balances
    const ledgerEntries: RetailerLedgerEntry[] = [];
    if (fromDate && (carryForwardBalance !== 0 || carryForwardCrateBalance !== 0)) {
      if (carryForwardBalance !== 0) {
        ledgerEntries.push({
          tenantId,
          date: new Date(fromDate),
          description: 'Opening Balance',
          referenceType: 'Sales Invoice' as const,
          referenceId: 'opening-balance',
          debit: carryForwardBalance > 0 ? carryForwardBalance : 0,
          credit: carryForwardBalance < 0 ? Math.abs(carryForwardBalance) : 0,
          balance: carryForwardBalance,
          createdAt: new Date()
        });
      }
      if (carryForwardCrateBalance !== 0) {
        ledgerEntries.push({
          tenantId,
          date: new Date(fromDate),
          description: 'Opening Crate Balance',
          referenceType: 'Crate Transaction' as const,
          referenceId: 'opening-crate-balance',
          debit: 0,
          credit: 0,
          balance: carryForwardBalance,
          crateBalance: carryForwardCrateBalance,
          createdAt: new Date()
        });
      }
    }
    
    const mappedEntries: RetailerLedgerEntry[] = allEntries.map(entry => {
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

    ledgerEntries.push(...mappedEntries);
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
      .map(retailer => {
        const balanceValue = parseFloat(retailer.udhaaarBalance || '0');
        return {
          tenantId,
          retailerId: retailer.id,
          retailerName: retailer.name,
          contactPerson: retailer.contactPerson,
          phone: retailer.phone,
          address: retailer.address,
          udhaarBalance: balanceValue,
          udhaaarBalance: balanceValue, // Keep legacy field for backward compatibility
          totalBalance: parseFloat(retailer.balance || '0'),
          shortfallBalance: parseFloat(retailer.shortfallBalance || '0'),
          crateBalance: retailer.crateBalance || 0,
          isActive: retailer.isActive,
          createdAt: retailer.createdAt
        };
      });

    return udhaaarEntries;
  }

  async getCrateLedger(tenantId: string, retailerId?: string, fromDate?: string, toDate?: string): Promise<CrateLedgerEntry[]> {
    // Calculate carry-forward balance if fromDate is provided and retailerId is specified
    const retailerCarryForwardBalances = new Map<string, number>();
    if (fromDate && retailerId) {
      const priorTransactions = await db.select().from(crateTransactions)
        .where(and(
          withTenant(crateTransactions, tenantId),
          eq(crateTransactions.retailerId, retailerId),
          lt(crateTransactions.transactionDate, new Date(fromDate))
        ));
      
      const carryForwardBalance = priorTransactions.reduce((sum, trans) => {
        return sum + (trans.transactionType === 'Given' ? trans.quantity : -trans.quantity);
      }, 0);
      
      retailerCarryForwardBalances.set(retailerId, carryForwardBalance);
    }

    // Build conditions array for WHERE clause
    const conditions = [
      withTenant(crateTransactions, tenantId)
    ];
    
    if (retailerId) {
      conditions.push(eq(crateTransactions.retailerId, retailerId));
    }
    
    if (fromDate) {
      conditions.push(gte(crateTransactions.transactionDate, new Date(fromDate)));
    }
    
    if (toDate) {
      const endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999);
      conditions.push(lte(crateTransactions.transactionDate, endOfDay));
    }
    
    const whereExpr = conditions.length > 1 ? and(...conditions) : conditions[0];

    const transactions = await db.select({
      id: crateTransactions.id,
      retailerId: crateTransactions.retailerId,
      retailerName: retailers.name,
      contactPerson: retailers.contactPerson,
      phone: retailers.phone,
      transactionType: crateTransactions.transactionType,
      quantity: crateTransactions.quantity,
      transactionDate: crateTransactions.transactionDate,
      notes: crateTransactions.notes,
      createdAt: crateTransactions.createdAt
    })
    .from(crateTransactions)
    .leftJoin(retailers, and(
      eq(crateTransactions.retailerId, retailers.id),
      withTenant(retailers, tenantId)
    ))
    .where(whereExpr)
    .orderBy(asc(crateTransactions.transactionDate), asc(crateTransactions.createdAt), asc(crateTransactions.id));

    // Calculate running crate balance for each retailer
    const retailerBalances = new Map<string, number>();
    
    // Initialize with carry-forward balances
    retailerCarryForwardBalances.forEach((balance, retailerId) => {
      retailerBalances.set(retailerId, balance);
    });
    
    const ledgerEntries: CrateLedgerEntry[] = [];
    
    // Add opening balance entries if fromDate is provided and there are carry-forward balances
    if (fromDate && retailerId && retailerCarryForwardBalances.has(retailerId)) {
      const carryForwardBalance = retailerCarryForwardBalances.get(retailerId)!;
      if (carryForwardBalance !== 0) {
        ledgerEntries.push({
          tenantId,
          id: '',
          retailerId: retailerId,
          retailerName: 'Opening Balance',
          contactPerson: '',
          phone: '',
          transactionType: carryForwardBalance > 0 ? 'Given' : 'Received',
          quantity: Math.abs(carryForwardBalance),
          depositAmount: 0,
          transactionDate: new Date(fromDate),
          notes: 'Opening Balance',
          runningBalance: carryForwardBalance,
          createdAt: new Date()
        });
      }
    }
    
    const mappedEntries: CrateLedgerEntry[] = transactions
      .filter(transaction => transaction.retailerId !== null) // Filter out null retailerIds
      .map(transaction => {
        const retailerId = transaction.retailerId!; // Non-null assertion after filter
        const currentBalance = retailerBalances.get(retailerId) || 0;
        let newBalance = currentBalance;

        if (transaction.transactionType === 'Given') {
          newBalance = currentBalance + transaction.quantity;
        } else if (transaction.transactionType === 'Received') {
          newBalance = currentBalance - transaction.quantity;
        }

        retailerBalances.set(retailerId, newBalance);

        return {
          tenantId,
          id: transaction.id,
          retailerId: retailerId,
          retailerName: transaction.retailerName || '',
          contactPerson: transaction.contactPerson || '',
          phone: transaction.phone || '',
          transactionType: transaction.transactionType,
          quantity: transaction.quantity,
          depositAmount: 0, // No depositAmount field in schema
          transactionDate: transaction.transactionDate,
          notes: transaction.notes || '',
          runningBalance: newBalance,
          createdAt: transaction.createdAt
        };
      });

    ledgerEntries.push(...mappedEntries);
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

  async getBankAccountById(tenantId: string, bankAccountId: string): Promise<any> {
    const [bankAccount] = await db.select().from(bankAccounts)
      .where(withTenant(bankAccounts, tenantId, eq(bankAccounts.id, bankAccountId)));
    return bankAccount;
  }

  async getBankAccountStats(tenantId: string): Promise<{ totalAccounts: number; totalBalance: string }> {
    const bankAccountModel = new BankAccountModel();
    return await bankAccountModel.getBankAccountStats(tenantId);
  }
}