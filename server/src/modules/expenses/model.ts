import { eq, desc, asc, inArray } from 'drizzle-orm';
import { db } from '../../../db';
import { expenseCategories, expenses, bankAccounts, type ExpenseCategory, type InsertExpenseCategory, type Expense, type InsertExpense, type ExpenseWithCategory } from '@shared/schema';
import { withTenant, ensureTenantInsert } from '../../utils/tenant-scope';

export class ExpenseModel {
  async getExpenseCategories(tenantId: string): Promise<ExpenseCategory[]> {
    return await db.select().from(expenseCategories)
      .where(withTenant(expenseCategories, tenantId, eq(expenseCategories.isActive, true)))
      .orderBy(asc(expenseCategories.name));
  }

  async getExpenseCategory(tenantId: string, id: string): Promise<ExpenseCategory | undefined> {
    const [category] = await db.select().from(expenseCategories)
      .where(withTenant(expenseCategories, tenantId, eq(expenseCategories.id, id)));
    return category;
  }

  async createExpenseCategory(tenantId: string, categoryData: InsertExpenseCategory): Promise<ExpenseCategory> {
    const categoryWithTenant = ensureTenantInsert(categoryData, tenantId);
    const [category] = await db.insert(expenseCategories).values(categoryWithTenant).returning();
    return category;
  }

  async updateExpenseCategory(tenantId: string, id: string, categoryData: Partial<InsertExpenseCategory>): Promise<ExpenseCategory | undefined> {
    const [category] = await db.update(expenseCategories)
      .set(categoryData)
      .where(withTenant(expenseCategories, tenantId, eq(expenseCategories.id, id)))
      .returning();
    return category;
  }

  async deleteExpenseCategory(tenantId: string, id: string): Promise<boolean> {
    const [category] = await db.update(expenseCategories)
      .set({ isActive: false })
      .where(withTenant(expenseCategories, tenantId, eq(expenseCategories.id, id)))
      .returning();
    return !!category;
  }

  async getExpenses(tenantId: string): Promise<ExpenseWithCategory[]> {
    const expensesData = await db.select().from(expenses)
      .where(withTenant(expenses, tenantId))
      .orderBy(desc(expenses.createdAt));

    if (expensesData.length === 0) {
      return [];
    }

    // Batch fetch related data
    const categoryIds = expensesData.map(e => e.categoryId);
    const bankAccountIds = expensesData
      .map(e => e.bankAccountId)
      .filter(id => id !== null) as string[];

    const [categoriesData, bankAccountsData] = await Promise.all([
      categoryIds.length > 0 ? db.select().from(expenseCategories).where(withTenant(expenseCategories, tenantId, inArray(expenseCategories.id, categoryIds))) : [],
      bankAccountIds.length > 0 ? db.select().from(bankAccounts).where(withTenant(bankAccounts, tenantId, inArray(bankAccounts.id, bankAccountIds))) : []
    ]);

    // Create lookup maps
    const categoryMap = new Map(categoriesData.map(c => [c.id, c]));
    const bankAccountMap = new Map(bankAccountsData.map(b => [b.id, b]));

    // Assemble final data
    const result = expensesData.map(expense => ({
      ...expense,
      category: categoryMap.get(expense.categoryId) || null,
      bankAccount: expense.bankAccountId ? (bankAccountMap.get(expense.bankAccountId) || null) : null
    }));

    return result;
  }

  async getExpense(tenantId: string, id: string): Promise<ExpenseWithCategory | undefined> {
    const [expense] = await db.select().from(expenses)
      .where(withTenant(expenses, tenantId, eq(expenses.id, id)));

    if (!expense) {
      return undefined;
    }

    // Get related data with tenant filtering
    const [category, bankAccount] = await Promise.all([
      db.select().from(expenseCategories).where(withTenant(expenseCategories, tenantId, eq(expenseCategories.id, expense.categoryId))).then(result => result[0]),
      expense.bankAccountId ? 
        db.select().from(bankAccounts).where(withTenant(bankAccounts, tenantId, eq(bankAccounts.id, expense.bankAccountId))).then(result => result[0]) : 
        undefined
    ]);

    return {
      ...expense,
      category: category || null,
      bankAccount: bankAccount || null
    } as ExpenseWithCategory;
  }

  async createExpense(tenantId: string, expenseData: InsertExpense): Promise<ExpenseWithCategory> {
    // Validate category and bank account exist before creating with tenant filtering
    const [category, bankAccount] = await Promise.all([
      db.select().from(expenseCategories).where(withTenant(expenseCategories, tenantId, eq(expenseCategories.id, expenseData.categoryId))).then(result => result[0]),
      expenseData.bankAccountId ? 
        db.select().from(bankAccounts).where(withTenant(bankAccounts, tenantId, eq(bankAccounts.id, expenseData.bankAccountId))).then(result => result[0]) : 
        null
    ]);

    if (!category) {
      throw new Error('Invalid category');
    }

    if (expenseData.bankAccountId && !bankAccount) {
      throw new Error('Invalid bank account');
    }

    const expenseWithTenant = ensureTenantInsert(expenseData, tenantId);
    const [expense] = await db.insert(expenses).values(expenseWithTenant).returning();

    return {
      ...expense,
      category: category || null,
      bankAccount: bankAccount || null
    };
  }
}