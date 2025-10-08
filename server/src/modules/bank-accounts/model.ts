import { eq, asc, and, count, sum, sql } from 'drizzle-orm';
import { db } from '../../../db';
import { 
  bankAccounts, 
  payments,
  salesPayments,
  bankbook,
  expenses,
  type BankAccount, 
  type InsertBankAccount,
  type PaginationOptions,
  type PaginatedResult
} from '@shared/schema';
import { withTenant, ensureTenantInsert } from '../../utils/tenant-scope';
import { applySorting, applySearchFilter, getCountWithSearch, buildPaginationMetadata, withTenantPagination } from '../../utils/pagination';
import { BadRequestError } from '../../types';

export class BankAccountModel {
  async getBankAccounts(tenantId: string): Promise<BankAccount[]> {
    return await db.select().from(bankAccounts)
      .where(withTenant(bankAccounts, tenantId, eq(bankAccounts.isActive, true)))
      .orderBy(asc(bankAccounts.name));
  }

  async getBankAccountById(tenantId: string, id: string): Promise<BankAccount | undefined> {
    const [bankAccount] = await db.select().from(bankAccounts)
      .where(withTenant(bankAccounts, tenantId, eq(bankAccounts.id, id)));
    return bankAccount;
  }

  async createBankAccount(tenantId: string, insertBankAccount: InsertBankAccount): Promise<BankAccount> {
    return await db.transaction(async (tx) => {
      // Insert the bank account with the provided balance
      const [created] = await tx.insert(bankAccounts)
        .values(ensureTenantInsert(insertBankAccount, tenantId))
        .returning();

      // Check if the balance is greater than 0 and create opening balance entry
      const balance = parseFloat(insertBankAccount.balance || '0');
      if (balance > 0) {
        await tx.insert(bankbook)
          .values(ensureTenantInsert({
            bankAccountId: created.id,
            date: new Date(),
            description: "Opening Balance",
            debit: balance.toFixed(2),
            credit: "0.00",
            balance: balance.toFixed(2),
            referenceType: "Opening Balance",
            referenceId: null
          }, tenantId));
      }

      return created;
    });
  }

  async updateBankAccount(tenantId: string, id: string, insertBankAccount: Partial<InsertBankAccount>): Promise<BankAccount | undefined> {
    const [updated] = await db.update(bankAccounts)
      .set(insertBankAccount)
      .where(withTenant(bankAccounts, tenantId, eq(bankAccounts.id, id)))
      .returning();
    return updated;
  }

  async deleteBankAccount(tenantId: string, id: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      // Check if bank account is referenced in payments table
      const paymentReferences = await tx.select({ count: count() }).from(payments)
        .where(withTenant(payments, tenantId, eq(payments.bankAccountId, id)));
      
      if (paymentReferences[0].count > 0) {
        throw new BadRequestError('Cannot delete bank account: it is referenced in payments');
      }

      // Check if bank account is referenced in salesPayments table
      const salesPaymentReferences = await tx.select({ count: count() }).from(salesPayments)
        .where(withTenant(salesPayments, tenantId, eq(salesPayments.bankAccountId, id)));
      
      if (salesPaymentReferences[0].count > 0) {
        throw new BadRequestError('Cannot delete bank account: it is referenced in sales payments');
      }

      // Check if bank account is referenced in bankbook table
      const bankbookReferences = await tx.select({ count: count() }).from(bankbook)
        .where(withTenant(bankbook, tenantId, eq(bankbook.bankAccountId, id)));
      
      if (bankbookReferences[0].count > 0) {
        throw new BadRequestError('Cannot delete bank account: it is referenced in bank book entries');
      }

      // Check if bank account is referenced in expenses table
      const expenseReferences = await tx.select({ count: count() }).from(expenses)
        .where(withTenant(expenses, tenantId, eq(expenses.bankAccountId, id)));
      
      if (expenseReferences[0].count > 0) {
        throw new BadRequestError('Cannot delete bank account: it is referenced in expenses');
      }

      // If no references found, delete the bank account
      const [deletedBankAccount] = await tx.delete(bankAccounts)
        .where(withTenant(bankAccounts, tenantId, eq(bankAccounts.id, id)))
        .returning();
      
      return !!deletedBankAccount;
    });
  }

  static async getBankAccountsPaginated(tenantId: string, options: PaginationOptions): Promise<PaginatedResult<BankAccount>> {
    const { page, limit, offset, tenantCondition } = withTenantPagination(bankAccounts, tenantId, options);
    
    // Define table columns for sorting and searching
    const tableColumns = {
      name: bankAccounts.name,
      accountNumber: bankAccounts.accountNumber,
      bankName: bankAccounts.bankName,
      balance: bankAccounts.balance,
      createdAt: bankAccounts.createdAt
    };
    
    const searchableColumns = [bankAccounts.name, bankAccounts.accountNumber, bankAccounts.bankName];
    
    // Build WHERE conditions array starting with tenant filtering
    const whereConditions = [tenantCondition];
    
    // Filter by active bank accounts by default unless status is 'all'
    if (options.status !== 'all') {
      const isActive = options.status === 'inactive' ? false : true;
      whereConditions.push(eq(bankAccounts.isActive, isActive));
    }
    
    // Combine all conditions
    const combinedCondition = and(...whereConditions)!;
    
    let query = db.select().from(bankAccounts).where(combinedCondition);
    
    // Apply search filter using helper
    if (options.search) {
      query = applySearchFilter(query, options.search, searchableColumns, combinedCondition);
    }
    
    // Apply sorting using helper
    query = applySorting(query, options.sortBy || 'name', options.sortOrder || 'asc', tableColumns);
    
    // Apply pagination and execute
    const data = await query.limit(limit).offset(offset);
    
    // Get total count with tenant and isActive filtering
    const total = await getCountWithSearch(
      bankAccounts, 
      options.search ? searchableColumns : undefined, 
      options.search,
      combinedCondition
    );
    
    const pagination = buildPaginationMetadata(page, limit, total);
    
    return { data, pagination };
  }

  async getBankAccountStats(tenantId: string): Promise<{ totalAccounts: number; totalBalance: string }> {
    const [stats] = await db.select({
      totalAccounts: count(),
      totalBalance: sum(bankAccounts.balance)
    }).from(bankAccounts)
      .where(withTenant(bankAccounts, tenantId, eq(bankAccounts.isActive, true)));

    return {
      totalAccounts: stats.totalAccounts,
      totalBalance: stats.totalBalance || '0.00'
    };
  }

  static async updateBankAccountBalance(tx: any, tenantId: string, bankAccountId: string, amountDelta: number): Promise<void> {
    // Use atomic SQL increment to avoid concurrent update races
    const result = await tx.update(bankAccounts)
      .set({ 
        balance: sql`ROUND(COALESCE(${bankAccounts.balance}, 0)::numeric + ${amountDelta}, 2)::text`
      })
      .where(withTenant(bankAccounts, tenantId, eq(bankAccounts.id, bankAccountId)));
    
    // Check if bank account exists (affected rows)
    if (result.rowCount === 0) {
      throw new Error('Bank account not found');
    }
  }

  static async setBankAccountBalance(tx: any, tenantId: string, bankAccountId: string, newBalance: string): Promise<void> {
    // Set bank account balance to specific value to align with bankbook running balance
    const result = await tx.update(bankAccounts)
      .set({ balance: newBalance })
      .where(withTenant(bankAccounts, tenantId, eq(bankAccounts.id, bankAccountId)));
    
    // Check if bank account exists (affected rows)
    if (result.rowCount === 0) {
      throw new Error('Bank account not found');
    }
  }
}