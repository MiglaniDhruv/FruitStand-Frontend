import { 
  type User, 
  type InsertUser,
  type Vendor,
  type InsertVendor,
  type Item,
  type InsertItem,
  type BankAccount,
  type InsertBankAccount,
  type PurchaseInvoice,
  type InsertPurchaseInvoice,
  type InvoiceItem,
  type InsertInvoiceItem,
  type Payment,
  type InsertPayment,
  type Stock,
  type InsertStock,
  type StockMovement,
  type InsertStockMovement,
  type CashbookEntry,
  type BankbookEntry,
  type InvoiceWithItems,
  type PaymentWithDetails,
  type StockWithItem,
  type Retailer,
  type InsertRetailer,
  type SalesInvoice,
  type InsertSalesInvoice,
  type SalesInvoiceItem,
  type InsertSalesInvoiceItem,
  type SalesPayment,
  type InsertSalesPayment,
  type CrateTransaction,
  type InsertCrateTransaction,
  type ExpenseCategory,
  type InsertExpenseCategory,
  type Expense,
  type InsertExpense,
  type SalesInvoiceWithDetails,
  type ExpenseWithCategory,
  type CrateTransactionWithRetailer,
  type PaginationOptions,
  type PaginationMetadata,
  type PaginatedResult,
  type SortOrder
} from "@shared/schema";
import bcrypt from "bcrypt";
import { db } from "./db";
import { eq, desc, and, asc, sum, sql, ilike, or, count, gte, lte, lt, inArray } from "drizzle-orm";
import { 
  users, 
  vendors, 
  items, 
  bankAccounts, 
  purchaseInvoices, 

  invoiceItems, 
  payments, 
  stock, 
  stockMovements, 
  cashbook, 
  bankbook,
  retailers,
  salesInvoices,
  salesInvoiceItems,
  salesPayments,
  crateTransactions,
  expenseCategories,
  expenses
} from "@shared/schema";

// Pagination constants
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

// Pagination utility functions
function calculateOffset(page: number, limit: number): number {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), MAX_PAGE_SIZE);
  return (safePage - 1) * safeLimit;
}

function buildPaginationMetadata(page: number, limit: number, total: number): PaginationMetadata {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), MAX_PAGE_SIZE);
  // Convention: totalPages is normalized to 1 when total is 0 to ensure consistent
  // pagination UI behavior (always shows at least 1 page even for empty results)
  const totalPages = total === 0 ? 1 : Math.ceil(total / safeLimit);
  
  return {
    page: safePage,
    limit: safeLimit,
    total,
    totalPages,
    hasNext: safePage < totalPages,
    hasPrevious: safePage > 1
  };
}

function applySorting(query: any, sortBy: string, sortOrder: SortOrder, tableColumns: any): any {
  if (!sortBy || !tableColumns[sortBy]) {
    return query;
  }
  
  const column = tableColumns[sortBy];
  return sortOrder === 'desc' ? query.orderBy(desc(column)) : query.orderBy(asc(column));
}

function applySearchFilter(query: any, search: string, searchableColumns: any[], existingPredicate?: any): any {
  if (!search || !searchableColumns.length) {
    return query;
  }
  
  const searchConditions = searchableColumns.map(column => 
    ilike(column, `%${search}%`)
  );
  
  const searchPredicate = or(...searchConditions);
  
  // Compose with existing predicate if provided
  if (existingPredicate) {
    return query.where(and(existingPredicate, searchPredicate));
  }
  
  return query.where(searchPredicate);
}

// Helper function to normalize pagination options
function normalizePaginationOptions(options: PaginationOptions): {
  page: number;
  limit: number;
  offset: number;
} {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(Math.max(1, options.limit || DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
  const offset = calculateOffset(page, limit);
  
  return { page, limit, offset };
}

// Helper function to build count query with search
async function getCountWithSearch(
  table: any, 
  searchableColumns?: any[], 
  search?: string, 
  additionalConditions?: any
): Promise<number> {
  const countQuery = db.select({ count: count() }).from(table);
  
  let conditions = [];
  
  if (additionalConditions) {
    conditions.push(additionalConditions);
  }
  
  if (search && searchableColumns?.length) {
    const searchConditions = searchableColumns.map(column => 
      ilike(column, `%${search}%`)
    );
    conditions.push(or(...searchConditions));
  }
  
  if (conditions.length > 0) {
    countQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions));
  }
  
  const result = await countQuery;
  return result[0]?.count || 0;
}

async function getTotalCount(table: any, whereConditions?: any): Promise<number> {
  const countQuery = db.select({ count: count() }).from(table);
  if (whereConditions) {
    countQuery.where(whereConditions);
  }
  const result = await countQuery;
  return result[0]?.count || 0;
}

export interface IStorage {
  // User management
  getUsers(): Promise<User[]>;
  getUsersPaginated(options: PaginationOptions): Promise<PaginatedResult<User>>;
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  updateUserPermissions(id: string, permissions: string[]): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  
  // Vendor management
  getVendors(): Promise<Vendor[]>;
  getVendorsPaginated(options: PaginationOptions): Promise<PaginatedResult<Vendor>>;
  getVendor(id: string): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: string, vendor: Partial<InsertVendor>): Promise<Vendor | undefined>;
  deleteVendor(id: string): Promise<boolean>;
  
  // Item management
  getItems(): Promise<Item[]>;
  getItemsPaginated(options: PaginationOptions): Promise<PaginatedResult<Item>>;
  getItemsByVendor(vendorId: string): Promise<Item[]>;
  getItem(id: string): Promise<Item | undefined>;
  createItem(item: InsertItem): Promise<Item>;
  updateItem(id: string, item: Partial<InsertItem>): Promise<Item | undefined>;
  deleteItem(id: string): Promise<boolean>;
  
  // Bank account management
  getBankAccounts(): Promise<BankAccount[]>;
  getBankAccount(id: string): Promise<BankAccount | undefined>;
  createBankAccount(account: InsertBankAccount): Promise<BankAccount>;
  updateBankAccount(id: string, account: Partial<InsertBankAccount>): Promise<BankAccount | undefined>;
  
  // Purchase invoice management
  getPurchaseInvoices(): Promise<InvoiceWithItems[]>;
  getPurchaseInvoice(id: string): Promise<InvoiceWithItems | undefined>;
  createPurchaseInvoice(invoice: InsertPurchaseInvoice, items: InsertInvoiceItem[]): Promise<InvoiceWithItems>;
  getPurchaseInvoicesPaginated(options: PaginationOptions): Promise<PaginatedResult<InvoiceWithItems>>;
  
  // Payment management
  getPayments(): Promise<PaymentWithDetails[]>;
  getPaymentsByInvoice(invoiceId: string): Promise<PaymentWithDetails[]>;
  createPayment(payment: InsertPayment): Promise<PaymentWithDetails>;
  
  // Stock management
  getStock(): Promise<StockWithItem[]>;
  getStockByItem(itemId: string): Promise<Stock | undefined>;
  updateStock(itemId: string, stock: Partial<InsertStock>): Promise<Stock>;
  getStockPaginated(options: PaginationOptions): Promise<PaginatedResult<StockWithItem>>;
  
  // Stock movement management
  getStockMovements(): Promise<StockMovement[]>;
  getStockMovementsByItem(itemId: string): Promise<any[]>;
  getAvailableStockOutEntriesByVendor(vendorId: string): Promise<any[]>;
  createStockMovement(movement: InsertStockMovement): Promise<StockMovement>;
  calculateStockBalance(itemId: string): Promise<{ crates: number; kgs: number; boxes: number }>;
  
  // Retailer management
  getRetailers(): Promise<Retailer[]>;
  getRetailer(id: string): Promise<Retailer | undefined>;
  createRetailer(retailer: InsertRetailer): Promise<Retailer>;
  updateRetailer(id: string, retailer: Partial<InsertRetailer>): Promise<Retailer | undefined>;
  deleteRetailer(id: string): Promise<boolean>;
  getRetailersPaginated(options: PaginationOptions): Promise<PaginatedResult<Retailer>>;
  
  // Sales invoice management
  getSalesInvoices(): Promise<SalesInvoiceWithDetails[]>;
  getSalesInvoice(id: string): Promise<SalesInvoiceWithDetails | undefined>;
  createSalesInvoice(invoice: InsertSalesInvoice, items: InsertSalesInvoiceItem[]): Promise<SalesInvoiceWithDetails>;
  markSalesInvoiceAsPaid(invoiceId: string): Promise<{ invoice: SalesInvoice; shortfallAdded: string; retailer: Retailer }>;
  
  // Paginated method for sales invoices
  getSalesInvoicesPaginated(
    options?: PaginationOptions & {
      search?: string;
      status?: 'paid' | 'unpaid';
      retailerId?: string;
      dateRange?: { from?: string; to?: string };
    }
  ): Promise<PaginatedResult<SalesInvoiceWithDetails>>;
  
  // Sales payment management
  getSalesPayments(): Promise<SalesPayment[]>;
  getSalesPaymentsByInvoice(invoiceId: string): Promise<SalesPayment[]>;
  createSalesPayment(payment: InsertSalesPayment): Promise<SalesPayment>;
  
  // Crate management
  getCrateTransactions(): Promise<CrateTransactionWithRetailer[]>;
  getCrateTransactionsByRetailer(retailerId: string): Promise<CrateTransaction[]>;
  createCrateTransaction(transaction: InsertCrateTransaction): Promise<CrateTransaction>;
  
  // Paginated method for crate transactions  
  getCrateTransactionsPaginated(
    options?: PaginationOptions & {
      search?: string;
      type?: 'given' | 'returned';
      retailerId?: string;
      dateRange?: { from?: string; to?: string };
    }
  ): Promise<PaginatedResult<CrateTransactionWithRetailer>>;
  
  // Expense category management
  getExpenseCategories(): Promise<ExpenseCategory[]>;
  getExpenseCategory(id: string): Promise<ExpenseCategory | undefined>;
  createExpenseCategory(category: InsertExpenseCategory): Promise<ExpenseCategory>;
  updateExpenseCategory(id: string, category: Partial<InsertExpenseCategory>): Promise<ExpenseCategory | undefined>;
  deleteExpenseCategory(id: string): Promise<boolean>;
  
  // Expense management
  getExpenses(): Promise<ExpenseWithCategory[]>;
  getExpense(id: string): Promise<ExpenseWithCategory | undefined>;
  createExpense(expense: InsertExpense): Promise<ExpenseWithCategory>;
  
  // Ledger and book management
  getCashbook(): Promise<CashbookEntry[]>;
  getBankbook(bankAccountId?: string): Promise<BankbookEntry[]>;
  getVendorLedger(vendorId: string): Promise<any[]>;
  getRetailerLedger(retailerId: string): Promise<any[]>;
  getUdhaaarBook(): Promise<any[]>;
  getCrateLedger(retailerId?: string): Promise<any[]>;
  
  // Dashboard KPIs
  getDashboardKPIs(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User management
  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.createdAt));
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, password: hashedPassword })
      .returning();
    return user;
  }

  async updateUser(id: string, insertUser: Partial<InsertUser>): Promise<User | undefined> {
    const updateData = { ...insertUser };
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async updateUserPermissions(id: string, permissions: string[]): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ permissions })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getUsersPaginated(options: PaginationOptions): Promise<PaginatedResult<User>> {
    const { page, limit, offset } = normalizePaginationOptions(options);
    
    // Define table columns for sorting and searching
    const tableColumns = {
      username: users.username,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt
    };
    
    const searchableColumns = [users.username, users.name];
    
    // Build base query
    let query = db.select().from(users);
    
    // Apply search filter using helper
    if (options.search) {
      query = applySearchFilter(query, options.search, searchableColumns);
    }
    
    // Apply sorting using helper
    query = applySorting(query, options.sortBy || 'createdAt', options.sortOrder || 'asc', tableColumns);
    
    // Apply pagination and execute
    const data = await query.limit(limit).offset(offset);
    
    // Get total count
    const total = await getCountWithSearch(
      users, 
      options.search ? searchableColumns : undefined, 
      options.search
    );
    
    const pagination = buildPaginationMetadata(page, limit, total);
    
    return { data, pagination };
  }

  // Vendor management
  async getVendors(): Promise<Vendor[]> {
    return await db.select().from(vendors).where(eq(vendors.isActive, true)).orderBy(asc(vendors.name));
  }

  async getVendor(id: string): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    return vendor || undefined;
  }

  async createVendor(insertVendor: InsertVendor): Promise<Vendor> {
    const [vendor] = await db.insert(vendors).values(insertVendor).returning();
    return vendor;
  }

  async updateVendor(id: string, insertVendor: Partial<InsertVendor>): Promise<Vendor | undefined> {
    const [vendor] = await db
      .update(vendors)
      .set(insertVendor)
      .where(eq(vendors.id, id))
      .returning();
    return vendor || undefined;
  }

  async deleteVendor(id: string): Promise<boolean> {
    const [vendor] = await db
      .update(vendors)
      .set({ isActive: false })
      .where(eq(vendors.id, id))
      .returning();
    return !!vendor;
  }

  async getVendorsPaginated(options: PaginationOptions): Promise<PaginatedResult<Vendor>> {
    const { page, limit, offset } = normalizePaginationOptions(options);
    
    // Define table columns for sorting and searching
    const tableColumns = {
      name: vendors.name,
      contactPerson: vendors.contactPerson,
      createdAt: vendors.createdAt
    };
    
    const searchableColumns = [vendors.name, vendors.contactPerson];
    
    // Build base query with isActive filter
    let query = db.select().from(vendors).where(eq(vendors.isActive, true));
    
    // Apply search filter using helper
    if (options.search) {
      query = applySearchFilter(query, options.search, searchableColumns, eq(vendors.isActive, true));
    }
    
    // Apply sorting using helper
    query = applySorting(query, options.sortBy || 'name', options.sortOrder || 'asc', tableColumns);
    
    // Apply pagination and execute
    const data = await query.limit(limit).offset(offset);
    
    // Get total count
    const total = await getCountWithSearch(
      vendors, 
      options.search ? searchableColumns : undefined, 
      options.search,
      eq(vendors.isActive, true)
    );
    
    const pagination = buildPaginationMetadata(page, limit, total);
    
    return { data, pagination };
  }

  // Item management
  async getItems(): Promise<Item[]> {
    return await db.select().from(items).where(eq(items.isActive, true)).orderBy(asc(items.name));
  }

  async getItemsByVendor(vendorId: string): Promise<Item[]> {
    return await db.select().from(items)
      .where(and(eq(items.vendorId, vendorId), eq(items.isActive, true)))
      .orderBy(asc(items.name));
  }

  async getItem(id: string): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    return item || undefined;
  }

  async createItem(insertItem: InsertItem): Promise<Item> {
    const [item] = await db.insert(items).values(insertItem).returning();
    return item;
  }

  async updateItem(id: string, insertItem: Partial<InsertItem>): Promise<Item | undefined> {
    const [item] = await db
      .update(items)
      .set(insertItem)
      .where(eq(items.id, id))
      .returning();
    return item || undefined;
  }

  async deleteItem(id: string): Promise<boolean> {
    const [item] = await db
      .update(items)
      .set({ isActive: false })
      .where(eq(items.id, id))
      .returning();
    return !!item;
  }

  async getItemsPaginated(options: PaginationOptions): Promise<PaginatedResult<Item>> {
    const { page, limit, offset } = normalizePaginationOptions(options);
    
    // Define table columns for sorting and searching
    const tableColumns = {
      name: items.name,
      quality: items.quality,
      unit: items.unit,
      createdAt: items.createdAt
    };
    
    const searchableColumns = [items.name];
    
    // Build base query with isActive filter
    let query = db.select().from(items).where(eq(items.isActive, true));
    
    // Apply search filter using helper
    if (options.search) {
      query = applySearchFilter(query, options.search, searchableColumns, eq(items.isActive, true));
    }
    
    // Apply sorting using helper
    query = applySorting(query, options.sortBy || 'name', options.sortOrder || 'asc', tableColumns);
    
    // Apply pagination and execute
    const data = await query.limit(limit).offset(offset);
    
    // Get total count
    const total = await getCountWithSearch(
      items, 
      options.search ? searchableColumns : undefined, 
      options.search,
      eq(items.isActive, true)
    );
    
    const pagination = buildPaginationMetadata(page, limit, total);
    
    return { data, pagination };
  }

  async getRetailersPaginated(options?: PaginationOptions & {
    search?: string;
    status?: 'active' | 'inactive';
    dateRange?: { from?: string; to?: string };
  }): Promise<PaginatedResult<Retailer>> {
    const { page, limit, offset } = normalizePaginationOptions(options || {});
    
    // Define table columns for sorting and searching
    const tableColumns = {
      name: retailers.name,
      phone: retailers.phone,
      createdAt: retailers.createdAt
    };
    
    const searchableColumns = [retailers.name, retailers.phone];
    
    // Build base query with isActive filter
    let query = db.select().from(retailers).where(eq(retailers.isActive, true));
    
    // Apply search filter
    if (options?.search) {
      query = applySearchFilter(query, options.search, searchableColumns, eq(retailers.isActive, true));
    }
    
    // Apply sorting
    query = applySorting(query, options?.sortBy || 'createdAt', options?.sortOrder || 'desc', tableColumns);
    
    // Apply pagination and execute
    const data = await query.limit(limit).offset(offset);
    
    // Get total count
    const total = await getCountWithSearch(
      retailers, 
      options?.search ? searchableColumns : undefined, 
      options?.search,
      eq(retailers.isActive, true)
    );
    
    const pagination = buildPaginationMetadata(page, limit, total);
    
    return { data, pagination };
  }

  async getStockPaginated(options?: PaginationOptions & {
    search?: string;
    lowStock?: boolean;
  }): Promise<PaginatedResult<StockWithItem>> {
    const { page, limit, offset } = normalizePaginationOptions(options || {});
    
    // Build WHERE conditions array
    const whereConditions = [];
    
    // Filter by active items only
    whereConditions.push(eq(items.isActive, true));
    
    // Apply low stock filter
    if (options?.lowStock) {
      whereConditions.push(or(
        lte(stock.quantityInCrates, '5'),
        lte(stock.quantityInBoxes, '10'),
        lte(stock.quantityInKgs, '50')
      ));
    }
    

    
    // Handle search by getting matching item/vendor IDs
    if (options?.search) {
      // Get item IDs that match search
      const matchingItems = await db.select({ id: items.id })
        .from(items)
        .where(ilike(items.name, `%${options.search}%`));
      const itemIds = matchingItems.map(i => i.id);
      
      // Get vendor IDs that match search
      const matchingVendors = await db.select({ id: vendors.id })
        .from(vendors)
        .where(ilike(vendors.name, `%${options.search}%`));
      const vendorIds = matchingVendors.map(v => v.id);
      
      // Build search conditions
      const searchConditions = [];
      
      if (itemIds.length > 0) {
        searchConditions.push(inArray(items.id, itemIds));
      }
      
      if (vendorIds.length > 0) {
        searchConditions.push(inArray(items.vendorId, vendorIds));
      }
      
      if (searchConditions.length > 0) {
        whereConditions.push(or(...searchConditions));
      }
    }
    
    // Combine all conditions
    const finalWhereCondition = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    
    // Apply sorting
    const sortBy = options?.sortBy || 'lastUpdated';
    const sortOrder = options?.sortOrder || 'desc';
    
    // Build sorting order
    let orderByClause;
    if (sortBy === 'itemName') {
      orderByClause = sortOrder === 'asc' ? asc(items.name) : desc(items.name);
    } else if (sortBy === 'vendorName') {
      orderByClause = sortOrder === 'asc' ? asc(vendors.name) : desc(vendors.name);
    } else if (sortBy === 'quantityInCrates') {
      orderByClause = sortOrder === 'asc' ? asc(stock.quantityInCrates) : desc(stock.quantityInCrates);
    } else if (sortBy === 'quantityInBoxes') {
      orderByClause = sortOrder === 'asc' ? asc(stock.quantityInBoxes) : desc(stock.quantityInBoxes);
    } else if (sortBy === 'quantityInKgs') {
      orderByClause = sortOrder === 'asc' ? asc(stock.quantityInKgs) : desc(stock.quantityInKgs);
    } else { // default to lastUpdated
      orderByClause = sortOrder === 'asc' ? asc(stock.lastUpdated) : desc(stock.lastUpdated);
    }
    
    // Build and execute paginated query with JOINs
    const stockData = await (
      finalWhereCondition
        ? db.select({
            stock: stock,
            item: items,
            vendor: vendors
          })
          .from(stock)
          .leftJoin(items, eq(stock.itemId, items.id))
          .leftJoin(vendors, eq(items.vendorId, vendors.id))
          .where(finalWhereCondition)
          .orderBy(orderByClause)
          .limit(limit)
          .offset(offset)
        : db.select({
            stock: stock,
            item: items,
            vendor: vendors
          })
          .from(stock)
          .leftJoin(items, eq(stock.itemId, items.id))
          .leftJoin(vendors, eq(items.vendorId, vendors.id))
          .orderBy(orderByClause)
          .limit(limit)
          .offset(offset)
    );
    
    // Assemble final data
    const data = stockData
      .filter(record => record.item && record.vendor) // Filter out records without valid item/vendor
      .map(record => ({
        ...record.stock,
        item: { ...record.item!, vendor: record.vendor! }
      })) as StockWithItem[];
    
    // Get total count with same conditions
    const [{ count: total }] = await (
      finalWhereCondition
        ? db.select({ count: count() })
          .from(stock)
          .leftJoin(items, eq(stock.itemId, items.id))
          .leftJoin(vendors, eq(items.vendorId, vendors.id))
          .where(finalWhereCondition)
        : db.select({ count: count() })
          .from(stock)
          .leftJoin(items, eq(stock.itemId, items.id))
          .leftJoin(vendors, eq(items.vendorId, vendors.id))
    );
    
    const pagination = buildPaginationMetadata(page, limit, total);
    
    return { data, pagination };
  }

  async getPurchaseInvoicesPaginated(options?: PaginationOptions & {
    search?: string;
    status?: 'paid' | 'unpaid';
    vendorId?: string;
    dateRange?: { from?: string; to?: string };
  }): Promise<PaginatedResult<InvoiceWithItems>> {
    const { page, limit, offset } = normalizePaginationOptions(options || {});
    
    // Build WHERE conditions array
    const whereConditions = [];
    
    // Apply status filter 
    if (options?.status === 'paid') {
      whereConditions.push(eq(purchaseInvoices.status, 'Paid'));
    } else if (options?.status === 'unpaid') {
      whereConditions.push(or(
        eq(purchaseInvoices.status, 'Unpaid'),
        eq(purchaseInvoices.status, 'Partially Paid')
      ));
    }
    
    // Apply vendor filter
    if (options?.vendorId) {
      whereConditions.push(eq(purchaseInvoices.vendorId, options.vendorId));
    }
    
    // Apply date range filter
    if (options?.dateRange?.from) {
      whereConditions.push(gte(purchaseInvoices.invoiceDate, new Date(options.dateRange.from)));
    }
    if (options?.dateRange?.to) {
      whereConditions.push(lte(purchaseInvoices.invoiceDate, new Date(options.dateRange.to)));
    }
    
    // Handle search by getting vendor IDs if searching by vendor name
    if (options?.search) {
      // Get vendor IDs that match search
      const matchingVendors = await db.select({ id: vendors.id })
        .from(vendors)
        .where(ilike(vendors.name, `%${options.search}%`));
      const vendorIds = matchingVendors.map(v => v.id);
      
      // Build search conditions
      const searchConditions = [
        ilike(purchaseInvoices.invoiceNumber, `%${options.search}%`),
        ilike(purchaseInvoices.status, `%${options.search}%`)
      ];
      
      if (vendorIds.length > 0) {
        searchConditions.push(inArray(purchaseInvoices.vendorId, vendorIds));
      }
      
      whereConditions.push(or(...searchConditions));
    }
    
    // Combine all conditions
    const finalWhereCondition = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    
    // Apply sorting
    const sortBy = options?.sortBy || 'createdAt';
    const sortOrder = options?.sortOrder || 'desc';
    
    // Build sorting order
    let orderByClause;
    if (sortBy === 'invoiceDate') {
      orderByClause = sortOrder === 'asc' ? asc(purchaseInvoices.invoiceDate) : desc(purchaseInvoices.invoiceDate);
    } else if (sortBy === 'invoiceNumber') {
      orderByClause = sortOrder === 'asc' ? asc(purchaseInvoices.invoiceNumber) : desc(purchaseInvoices.invoiceNumber);
    } else if (sortBy === 'totalAmount') {
      orderByClause = sortOrder === 'asc' ? asc(purchaseInvoices.netAmount) : desc(purchaseInvoices.netAmount);
    } else if (sortBy === 'status') {
      orderByClause = sortOrder === 'asc' ? asc(purchaseInvoices.status) : desc(purchaseInvoices.status);
    } else { // default to createdAt
      orderByClause = sortOrder === 'asc' ? asc(purchaseInvoices.createdAt) : desc(purchaseInvoices.createdAt);
    }
    
    // Build and execute paginated query in one chain
    const invoices = await (
      finalWhereCondition
        ? db.select().from(purchaseInvoices).where(finalWhereCondition).orderBy(orderByClause).limit(limit).offset(offset)
        : db.select().from(purchaseInvoices).orderBy(orderByClause).limit(limit).offset(offset)
    );
    
    // Get unique vendor IDs from results
    const uniqueVendorIds = Array.from(new Set(invoices.map(inv => inv.vendorId)));
    
    // Batch fetch vendors
    const vendorData = uniqueVendorIds.length > 0 ? 
      await db.select()
        .from(vendors)
        .where(inArray(vendors.id, uniqueVendorIds)) : [];
    
    const vendorMap = vendorData.reduce((acc, vendor) => {
      acc[vendor.id] = vendor;
      return acc;
    }, {} as Record<string, typeof vendorData[0]>);
    
    // Get invoice IDs for batched item fetching
    const invoiceIds = invoices.map(inv => inv.id);
    
    // Batch fetch invoice items
    const invoiceItemsData = invoiceIds.length > 0 ? 
      await db.select()
        .from(invoiceItems)
        .where(inArray(invoiceItems.invoiceId, invoiceIds)) : [];
    
    // Group items by invoice ID
    const itemsByInvoice = invoiceItemsData.reduce((acc, item) => {
      if (!acc[item.invoiceId]) acc[item.invoiceId] = [];
      acc[item.invoiceId].push(item);
      return acc;
    }, {} as Record<string, typeof invoiceItemsData>);
    
    // Assemble final data
    const data = invoices
      .filter(invoice => vendorMap[invoice.vendorId]) // Filter out invoices without valid vendors
      .map(invoice => ({
        ...invoice,
        vendor: vendorMap[invoice.vendorId],
        items: itemsByInvoice[invoice.id] || []
      })) as InvoiceWithItems[];
    
    // Get total count with same conditions
    const [{ count: total }] = await (
      finalWhereCondition
        ? db.select({ count: count() }).from(purchaseInvoices).where(finalWhereCondition)
        : db.select({ count: count() }).from(purchaseInvoices)
    );
    
    const pagination = buildPaginationMetadata(page, limit, total);
    
    return { data, pagination };
  }

  async getSalesInvoicesPaginated(options?: PaginationOptions & {
    search?: string;
    status?: 'paid' | 'unpaid';
    retailerId?: string;
    dateRange?: { from?: string; to?: string };
  }): Promise<PaginatedResult<SalesInvoiceWithDetails>> {
    const { page, limit, offset } = normalizePaginationOptions(options || {});
    
    // Build WHERE conditions array
    const whereConditions = [];
    
    // Apply status filter 
    if (options?.status === 'paid') {
      whereConditions.push(eq(salesInvoices.status, 'Paid'));
    } else if (options?.status === 'unpaid') {
      whereConditions.push(or(
        eq(salesInvoices.status, 'Unpaid'),
        eq(salesInvoices.status, 'Partially Paid')
      ));
    }
    
    // Apply retailer filter
    if (options?.retailerId) {
      whereConditions.push(eq(salesInvoices.retailerId, options.retailerId));
    }
    
    // Apply date range filter
    if (options?.dateRange?.from) {
      whereConditions.push(gte(salesInvoices.invoiceDate, new Date(options.dateRange.from)));
    }
    if (options?.dateRange?.to) {
      whereConditions.push(lte(salesInvoices.invoiceDate, new Date(options.dateRange.to)));
    }
    
    // Handle search by getting retailer IDs if searching by retailer name
    if (options?.search) {
      // Get retailer IDs that match search
      const matchingRetailers = await db.select({ id: retailers.id })
        .from(retailers)
        .where(ilike(retailers.name, `%${options.search}%`));
      const retailerIds = matchingRetailers.map(r => r.id);
      
      // Build search conditions
      const searchConditions = [
        ilike(salesInvoices.invoiceNumber, `%${options.search}%`),
        ilike(salesInvoices.status, `%${options.search}%`)
      ];
      
      if (retailerIds.length > 0) {
        searchConditions.push(inArray(salesInvoices.retailerId, retailerIds));
      }
      
      whereConditions.push(or(...searchConditions));
    }
    
    // Combine all conditions
    const finalWhereCondition = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    
    // Apply sorting
    const sortBy = options?.sortBy || 'createdAt';
    const sortOrder = options?.sortOrder || 'desc';
    
    // Build sorting order
    let orderByClause;
    if (sortBy === 'invoiceDate') {
      orderByClause = sortOrder === 'asc' ? asc(salesInvoices.invoiceDate) : desc(salesInvoices.invoiceDate);
    } else if (sortBy === 'invoiceNumber') {
      orderByClause = sortOrder === 'asc' ? asc(salesInvoices.invoiceNumber) : desc(salesInvoices.invoiceNumber);
    } else if (sortBy === 'totalAmount') {
      orderByClause = sortOrder === 'asc' ? asc(salesInvoices.totalAmount) : desc(salesInvoices.totalAmount);
    } else if (sortBy === 'status') {
      orderByClause = sortOrder === 'asc' ? asc(salesInvoices.status) : desc(salesInvoices.status);
    } else { // default to createdAt
      orderByClause = sortOrder === 'asc' ? asc(salesInvoices.createdAt) : desc(salesInvoices.createdAt);
    }
    
    // Build and execute paginated query in one chain
    const invoices = await (
      finalWhereCondition
        ? db.select().from(salesInvoices).where(finalWhereCondition).orderBy(orderByClause).limit(limit).offset(offset)
        : db.select().from(salesInvoices).orderBy(orderByClause).limit(limit).offset(offset)
    );
    
    // Get unique retailer IDs from results
    const uniqueRetailerIds = Array.from(new Set(invoices.map(inv => inv.retailerId)));
    
    // Batch fetch retailers
    const retailerData = uniqueRetailerIds.length > 0 ? 
      await db.select()
        .from(retailers)
        .where(inArray(retailers.id, uniqueRetailerIds)) : [];
    
    const retailerMap = retailerData.reduce((acc, retailer) => {
      acc[retailer.id] = retailer;
      return acc;
    }, {} as Record<string, typeof retailerData[0]>);
    
    // Get invoice IDs for batched item fetching
    const invoiceIds = invoices.map(inv => inv.id);
    
    // Batch fetch sales items
    const salesItemsData = invoiceIds.length > 0 ? 
      await db.select()
        .from(salesInvoiceItems)
        .where(inArray(salesInvoiceItems.invoiceId, invoiceIds)) : [];
    
    // Group items by invoice ID
    const itemsByInvoice = salesItemsData.reduce((acc, item) => {
      if (!acc[item.invoiceId]) acc[item.invoiceId] = [];
      acc[item.invoiceId].push(item);
      return acc;
    }, {} as Record<string, typeof salesItemsData>);
    
    // Batch fetch sales payments
    const paymentsData = invoiceIds.length > 0 ? 
      await db.select()
        .from(salesPayments)
        .where(inArray(salesPayments.invoiceId, invoiceIds)) : [];
    
    // Group payments by invoice ID
    const paymentsByInvoice = paymentsData.reduce((acc, payment) => {
      if (!acc[payment.invoiceId]) acc[payment.invoiceId] = [];
      acc[payment.invoiceId].push(payment);
      return acc;
    }, {} as Record<string, typeof paymentsData>);
    
    // Assemble final data
    const data = invoices
      .filter(invoice => retailerMap[invoice.retailerId]) // Filter out invoices without valid retailers
      .map(invoice => ({
        ...invoice,
        retailer: retailerMap[invoice.retailerId],
        items: itemsByInvoice[invoice.id] || [],
        payments: paymentsByInvoice[invoice.id] || []
      })) as SalesInvoiceWithDetails[];
    
    // Get total count with same conditions
    const [{ count: total }] = await (
      finalWhereCondition
        ? db.select({ count: count() }).from(salesInvoices).where(finalWhereCondition)
        : db.select({ count: count() }).from(salesInvoices)
    );
    
    const pagination = buildPaginationMetadata(page, limit, total);
    
    return { data, pagination };
  }

  async getCrateTransactionsPaginated(options?: PaginationOptions & {
    search?: string;
    type?: 'given' | 'returned';
    retailerId?: string;
    dateRange?: { from?: string; to?: string };
  }): Promise<PaginatedResult<CrateTransactionWithRetailer>> {
    const { page, limit, offset } = normalizePaginationOptions(options || {});
    
    // Build WHERE conditions array
    const whereConditions = [];
    
    // Apply type filter
    if (options?.type) {
      const transactionType = options.type === 'given' ? 'Given' : 'Returned';
      whereConditions.push(eq(crateTransactions.transactionType, transactionType));
    }
    
    // Apply retailer filter
    if (options?.retailerId) {
      whereConditions.push(eq(crateTransactions.retailerId, options.retailerId));
    }
    
    // Apply date range filter
    if (options?.dateRange?.from) {
      whereConditions.push(gte(crateTransactions.transactionDate, new Date(options.dateRange.from)));
    }
    if (options?.dateRange?.to) {
      whereConditions.push(lte(crateTransactions.transactionDate, new Date(options.dateRange.to)));
    }
    
    // Handle search by getting retailer IDs if searching by retailer name
    if (options?.search) {
      // Get retailer IDs that match search
      const matchingRetailers = await db.select({ id: retailers.id })
        .from(retailers)
        .where(ilike(retailers.name, `%${options.search}%`));
      const retailerIds = matchingRetailers.map(r => r.id);
      
      // Build search conditions
      const searchConditions = [
        ilike(crateTransactions.transactionType, `%${options.search}%`),
        ilike(crateTransactions.notes, `%${options.search}%`)
      ];
      
      if (retailerIds.length > 0) {
        searchConditions.push(inArray(crateTransactions.retailerId, retailerIds));
      }
      
      whereConditions.push(or(...searchConditions));
    }
    
    // Combine all conditions
    const finalWhereCondition = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    
    // Apply sorting
    const sortBy = options?.sortBy || 'createdAt';
    const sortOrder = options?.sortOrder || 'desc';
    
    // Build sorting order
    let orderByClause;
    if (sortBy === 'retailerName') {
      orderByClause = sortOrder === 'asc' ? asc(retailers.name) : desc(retailers.name);
    } else if (sortBy === 'transactionDate') {
      orderByClause = sortOrder === 'asc' ? asc(crateTransactions.transactionDate) : desc(crateTransactions.transactionDate);
    } else if (sortBy === 'transactionType') {
      orderByClause = sortOrder === 'asc' ? asc(crateTransactions.transactionType) : desc(crateTransactions.transactionType);
    } else if (sortBy === 'quantity') {
      orderByClause = sortOrder === 'asc' ? asc(crateTransactions.quantity) : desc(crateTransactions.quantity);
    } else { // default to createdAt
      orderByClause = sortOrder === 'asc' ? asc(crateTransactions.createdAt) : desc(crateTransactions.createdAt);
    }
    
    // Build and execute paginated query with JOINs
    const transactionData = await (
      finalWhereCondition
        ? db.select({
            transaction: crateTransactions,
            retailer: retailers
          })
          .from(crateTransactions)
          .leftJoin(retailers, eq(crateTransactions.retailerId, retailers.id))
          .where(finalWhereCondition)
          .orderBy(orderByClause)
          .limit(limit)
          .offset(offset)
        : db.select({
            transaction: crateTransactions,
            retailer: retailers
          })
          .from(crateTransactions)
          .leftJoin(retailers, eq(crateTransactions.retailerId, retailers.id))
          .orderBy(orderByClause)
          .limit(limit)
          .offset(offset)
    );
    
    // Assemble final data
    const data = transactionData
      .filter(record => record.retailer) // Filter out transactions without valid retailers
      .map(record => ({
        ...record.transaction,
        retailer: record.retailer!
      })) as CrateTransactionWithRetailer[];
    
    // Get total count with same conditions
    const [{ count: total }] = await (
      finalWhereCondition
        ? db.select({ count: count() })
          .from(crateTransactions)
          .leftJoin(retailers, eq(crateTransactions.retailerId, retailers.id))
          .where(finalWhereCondition)
        : db.select({ count: count() })
          .from(crateTransactions)
          .leftJoin(retailers, eq(crateTransactions.retailerId, retailers.id))
    );
    
    const pagination = buildPaginationMetadata(page, limit, total);
    
    return { data, pagination };
  }

  // Bank account management
  async getBankAccounts(): Promise<BankAccount[]> {
    return await db.select().from(bankAccounts).where(eq(bankAccounts.isActive, true)).orderBy(asc(bankAccounts.name));
  }

  async getBankAccount(id: string): Promise<BankAccount | undefined> {
    const [account] = await db.select().from(bankAccounts).where(eq(bankAccounts.id, id));
    return account || undefined;
  }

  async createBankAccount(insertAccount: InsertBankAccount): Promise<BankAccount> {
    const [account] = await db.insert(bankAccounts).values(insertAccount).returning();
    return account;
  }

  async updateBankAccount(id: string, insertAccount: Partial<InsertBankAccount>): Promise<BankAccount | undefined> {
    const [account] = await db
      .update(bankAccounts)
      .set(insertAccount)
      .where(eq(bankAccounts.id, id))
      .returning();
    return account || undefined;
  }

  // Purchase invoice management
  async getPurchaseInvoices(): Promise<InvoiceWithItems[]> {
    const invoices = await db.select().from(purchaseInvoices)
      .orderBy(desc(purchaseInvoices.createdAt));

    const result = [];
    for (const invoice of invoices) {
      const [vendor] = await db.select().from(vendors)
        .where(eq(vendors.id, invoice.vendorId));
      const invoiceItemsList = await db.select().from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, invoice.id));
      result.push({ ...invoice, vendor: vendor || null, items: invoiceItemsList });
    }
    return result;
  }

  async getPurchaseInvoice(id: string): Promise<InvoiceWithItems | undefined> {
    const [invoice] = await db.select().from(purchaseInvoices)
      .where(eq(purchaseInvoices.id, id));

    if (!invoice) return undefined;

    const [vendor] = await db.select().from(vendors)
      .where(eq(vendors.id, invoice.vendorId));
    const itemsList = await db.select().from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoice.id));
    return { ...invoice, vendor: vendor || null, items: itemsList };
  }

  async createPurchaseInvoice(insertInvoice: InsertPurchaseInvoice, itemsList: InsertInvoiceItem[]): Promise<InvoiceWithItems> {
    const invoiceNumber = `PI${String(Date.now()).slice(-6)}`;
    const [invoice] = await db.insert(purchaseInvoices).values({
      ...insertInvoice,
      invoiceNumber,
      status: "Unpaid",
      balanceAmount: insertInvoice.netAmount,
    }).returning();

    const insertedItems = await db.insert(invoiceItems).values(
      itemsList.map(item => ({ ...item, invoiceId: invoice.id }))
    ).returning();

    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, invoice.vendorId));
    return { ...invoice, vendor: vendor || null, items: insertedItems };
  }

  // Payment management
  async getPayments(): Promise<PaymentWithDetails[]> {
    const paymentsList = await db.select().from(payments)
      .orderBy(desc(payments.createdAt));
    
    const result = [];
    for (const payment of paymentsList) {
      const [invoice] = await db.select().from(purchaseInvoices)
        .where(eq(purchaseInvoices.id, payment.invoiceId));
      const [vendor] = await db.select().from(vendors)
        .where(eq(vendors.id, payment.vendorId));
      const [bankAccount] = payment.bankAccountId ? 
        await db.select().from(bankAccounts).where(eq(bankAccounts.id, payment.bankAccountId)) : [null];
      
      result.push({ 
        ...payment, 
        invoice: invoice || null, 
        vendor: vendor || null, 
        bankAccount: bankAccount || null 
      });
    }
    return result as PaymentWithDetails[];
  }

  async getPaymentsByInvoice(invoiceId: string): Promise<PaymentWithDetails[]> {
    const paymentsList = await db.select().from(payments)
      .where(eq(payments.invoiceId, invoiceId))
      .orderBy(desc(payments.createdAt));
    
    const result = [];
    for (const payment of paymentsList) {
      const [invoice] = await db.select().from(purchaseInvoices)
        .where(eq(purchaseInvoices.id, payment.invoiceId));
      const [vendor] = await db.select().from(vendors)
        .where(eq(vendors.id, payment.vendorId));
      const [bankAccount] = payment.bankAccountId ? 
        await db.select().from(bankAccounts).where(eq(bankAccounts.id, payment.bankAccountId)) : [null];
      
      result.push({ 
        ...payment, 
        invoice: invoice || null, 
        vendor: vendor || null, 
        bankAccount: bankAccount || null 
      });
    }
    return result as PaymentWithDetails[];
  }

  async createPayment(insertPayment: InsertPayment): Promise<PaymentWithDetails> {
    const [payment] = await db.insert(payments).values(insertPayment).returning();
    
    const [invoice] = await db.select().from(purchaseInvoices)
      .where(eq(purchaseInvoices.id, payment.invoiceId));
    const [vendor] = await db.select().from(vendors)
      .where(eq(vendors.id, payment.vendorId));
    const [bankAccount] = payment.bankAccountId ? 
      await db.select().from(bankAccounts).where(eq(bankAccounts.id, payment.bankAccountId)) : [null];
    
    return { 
      ...payment, 
      invoice: invoice || null, 
      vendor: vendor || null, 
      bankAccount: bankAccount || null 
    } as PaymentWithDetails;
  }

  // Stock management
  async getStock(): Promise<StockWithItem[]> {
    const stockList = await db.select().from(stock);
    
    const result = [];
    for (const stockItem of stockList) {
      const [item] = await db.select().from(items)
        .where(eq(items.id, stockItem.itemId));
      if (item) {
        const [vendor] = await db.select().from(vendors)
          .where(eq(vendors.id, item.vendorId!));
        result.push({
          ...stockItem,
          item: { ...item, vendor: vendor || null }
        });
      }
    }
    return result as StockWithItem[];
  }

  async getStockByItem(itemId: string): Promise<Stock | undefined> {
    const [stockItem] = await db.select().from(stock).where(eq(stock.itemId, itemId));
    return stockItem || undefined;
  }

  async updateStock(itemId: string, insertStock: Partial<InsertStock>): Promise<Stock> {
    const existing = await this.getStockByItem(itemId);
    if (existing) {
      const [updated] = await db
        .update(stock)
        .set({ ...insertStock, lastUpdated: new Date() })
        .where(eq(stock.itemId, itemId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(stock).values({ ...insertStock, itemId }).returning();
      return created;
    }
  }

  // Stock movement management
  async getStockMovements(): Promise<StockMovement[]> {
    return await db.select().from(stockMovements).orderBy(desc(stockMovements.createdAt));
  }

  async getStockMovementsByItem(itemId: string): Promise<any[]> {
    const movements = await db.select().from(stockMovements)
      .where(eq(stockMovements.itemId, itemId))
      .orderBy(desc(stockMovements.createdAt));
    
    const result = [];
    for (const movement of movements) {
      const [item] = await db.select().from(items)
        .where(eq(items.id, movement.itemId));
      if (item) {
        const [vendor] = await db.select().from(vendors)
          .where(eq(vendors.id, item.vendorId!));
        result.push({
          ...movement,
          item: { ...item, vendor: vendor || null }
        });
      }
    }
    return result;
  }

  async getAvailableStockOutEntriesByVendor(vendorId: string): Promise<any[]> {
    // Get stock movements of type "OUT" for items owned by the vendor
    const movements = await db.select().from(stockMovements)
      .innerJoin(items, eq(stockMovements.itemId, items.id))
      .where(
        and(
          eq(items.vendorId, vendorId),
          eq(stockMovements.movementType, "OUT")
        )
      )
      .orderBy(desc(stockMovements.createdAt));
    
    const result = [];
    for (const movement of movements) {
      result.push({
        ...movement.stock_movements,
        item: movement.items
      });
    }
    return result;
  }

  async createStockMovement(insertMovement: InsertStockMovement): Promise<StockMovement> {
    const [movement] = await db.insert(stockMovements).values(insertMovement).returning();
    
    // Update stock balance after movement
    const balance = await this.calculateStockBalance(insertMovement.itemId);
    await this.updateStock(insertMovement.itemId, {
      quantityInCrates: balance.crates.toString(),
      quantityInBoxes: balance.boxes.toString(),
      quantityInKgs: balance.kgs.toString()
    });
    
    return movement;
  }

  async calculateStockBalance(itemId: string): Promise<{ crates: number; kgs: number; boxes: number }> {
    const movements = await db.select().from(stockMovements).where(eq(stockMovements.itemId, itemId));
    
    let totalCrates = 0;
    let totalKgs = 0;
    let totalBoxes = 0;
    
    movements.forEach(movement => {
      const cratesQty = parseFloat(movement.quantityInCrates);
      const kgsQty = parseFloat(movement.quantityInKgs);
      const boxesQty = parseFloat(movement.quantityInBoxes || "0");
      
      if (movement.movementType === "IN") {
        totalCrates += cratesQty;
        totalKgs += kgsQty;
        totalBoxes += boxesQty;
      } else {
        totalCrates -= cratesQty;
        totalKgs -= kgsQty;
        totalBoxes -= boxesQty;
      }
    });
    
    return { 
      crates: Math.max(0, totalCrates), 
      kgs: Math.max(0, totalKgs),
      boxes: Math.max(0, totalBoxes)
    };
  }

  // Retailer management
  async getRetailers(): Promise<Retailer[]> {
    return await db.select().from(retailers).where(eq(retailers.isActive, true)).orderBy(asc(retailers.name));
  }

  async getRetailer(id: string): Promise<Retailer | undefined> {
    const [retailer] = await db.select().from(retailers).where(eq(retailers.id, id));
    return retailer || undefined;
  }

  async createRetailer(insertRetailer: InsertRetailer): Promise<Retailer> {
    const [retailer] = await db.insert(retailers).values(insertRetailer).returning();
    return retailer;
  }

  async updateRetailer(id: string, insertRetailer: Partial<InsertRetailer>): Promise<Retailer | undefined> {
    const [retailer] = await db
      .update(retailers)
      .set(insertRetailer)
      .where(eq(retailers.id, id))
      .returning();
    return retailer || undefined;
  }

  async deleteRetailer(id: string): Promise<boolean> {
    const [retailer] = await db
      .update(retailers)
      .set({ isActive: false })
      .where(eq(retailers.id, id))
      .returning();
    return !!retailer;
  }

  // Sales invoice management
  async getSalesInvoices(): Promise<SalesInvoiceWithDetails[]> {
    const invoices = await db.select().from(salesInvoices)
      .orderBy(desc(salesInvoices.createdAt));

    const result = [];
    for (const invoice of invoices) {
      const [retailer] = await db.select().from(retailers)
        .where(eq(retailers.id, invoice.retailerId));
      const itemsList = await db.select().from(salesInvoiceItems)
        .where(eq(salesInvoiceItems.invoiceId, invoice.id));
      const paymentsList = await db.select().from(salesPayments)
        .where(eq(salesPayments.invoiceId, invoice.id));
      result.push({ ...invoice, retailer: retailer || null, items: itemsList, payments: paymentsList });
    }
    return result;
  }

  async getSalesInvoice(id: string): Promise<SalesInvoiceWithDetails | undefined> {
    const [invoice] = await db.select().from(salesInvoices)
      .where(eq(salesInvoices.id, id));

    if (!invoice) return undefined;

    const [retailer] = await db.select().from(retailers)
      .where(eq(retailers.id, invoice.retailerId));
    const itemsList = await db.select().from(salesInvoiceItems)
      .where(eq(salesInvoiceItems.invoiceId, invoice.id));
    const paymentsList = await db.select().from(salesPayments)
      .where(eq(salesPayments.invoiceId, invoice.id));
    return { ...invoice, retailer: retailer || null, items: itemsList, payments: paymentsList };
  }

  async createSalesInvoice(insertInvoice: InsertSalesInvoice, itemsList: InsertSalesInvoiceItem[]): Promise<SalesInvoiceWithDetails> {
    const invoiceNumber = `SI${String(Date.now()).slice(-6)}`;
    const [invoice] = await db.insert(salesInvoices).values({
      ...insertInvoice,
      invoiceNumber,
      status: "Unpaid",
      balanceAmount: insertInvoice.totalAmount,
    }).returning();

    const insertedItems = await db.insert(salesInvoiceItems).values(
      itemsList.map(item => ({ ...item, invoiceId: invoice.id }))
    ).returning();

    const [retailer] = await db.select().from(retailers).where(eq(retailers.id, invoice.retailerId));
    return { ...invoice, retailer: retailer || null, items: insertedItems, payments: [] };
  }

  async markSalesInvoiceAsPaid(invoiceId: string): Promise<{ invoice: SalesInvoice; shortfallAdded: string; retailer: Retailer }> {
    const [invoice] = await db.select().from(salesInvoices).where(eq(salesInvoices.id, invoiceId));
    if (!invoice) throw new Error("Invoice not found");

    const shortfallAmount = parseFloat(invoice.balanceAmount);
    const [updatedInvoice] = await db
      .update(salesInvoices)
      .set({ 
        paidAmount: invoice.totalAmount, 
        balanceAmount: "0.00", 
        shortfallAmount: shortfallAmount.toString(),
        status: "Paid" 
      })
      .where(eq(salesInvoices.id, invoiceId))
      .returning();

    const [retailer] = await db.select().from(retailers).where(eq(retailers.id, invoice.retailerId));
    const newShortfallBalance = parseFloat(retailer.shortfallBalance || "0") + shortfallAmount;
    await db
      .update(retailers)
      .set({ shortfallBalance: newShortfallBalance.toString() })
      .where(eq(retailers.id, retailer.id));

    const [updatedRetailer] = await db.select().from(retailers).where(eq(retailers.id, retailer.id));
    return { invoice: updatedInvoice, shortfallAdded: shortfallAmount.toString(), retailer: updatedRetailer };
  }

  // Sales payment management
  async getSalesPayments(): Promise<SalesPayment[]> {
    return await db.select().from(salesPayments).orderBy(desc(salesPayments.createdAt));
  }

  async getSalesPaymentsByInvoice(invoiceId: string): Promise<SalesPayment[]> {
    return await db.select().from(salesPayments)
      .where(eq(salesPayments.invoiceId, invoiceId))
      .orderBy(desc(salesPayments.createdAt));
  }

  async createSalesPayment(insertPayment: InsertSalesPayment): Promise<SalesPayment> {
    const [payment] = await db.insert(salesPayments).values(insertPayment).returning();
    return payment;
  }

  // Crate management
  async getCrateTransactions(): Promise<CrateTransactionWithRetailer[]> {
    const transactions = await db.select().from(crateTransactions)
      .orderBy(desc(crateTransactions.createdAt));
    
    const result = [];
    for (const transaction of transactions) {
      const [retailer] = await db.select().from(retailers)
        .where(eq(retailers.id, transaction.retailerId));
      result.push({ ...transaction, retailer: retailer || null });
    }
    return result as CrateTransactionWithRetailer[];
  }

  async getCrateTransactionsByRetailer(retailerId: string): Promise<CrateTransaction[]> {
    return await db.select().from(crateTransactions)
      .where(eq(crateTransactions.retailerId, retailerId))
      .orderBy(desc(crateTransactions.createdAt));
  }

  async createCrateTransaction(insertTransaction: InsertCrateTransaction): Promise<CrateTransaction> {
    const [transaction] = await db.insert(crateTransactions).values(insertTransaction).returning();
    return transaction;
  }

  // Expense category management
  async getExpenseCategories(): Promise<ExpenseCategory[]> {
    return await db.select().from(expenseCategories).where(eq(expenseCategories.isActive, true)).orderBy(asc(expenseCategories.name));
  }

  async getExpenseCategory(id: string): Promise<ExpenseCategory | undefined> {
    const [category] = await db.select().from(expenseCategories).where(eq(expenseCategories.id, id));
    return category || undefined;
  }

  async createExpenseCategory(insertCategory: InsertExpenseCategory): Promise<ExpenseCategory> {
    const [category] = await db.insert(expenseCategories).values(insertCategory).returning();
    return category;
  }

  async updateExpenseCategory(id: string, insertCategory: Partial<InsertExpenseCategory>): Promise<ExpenseCategory | undefined> {
    const [category] = await db
      .update(expenseCategories)
      .set(insertCategory)
      .where(eq(expenseCategories.id, id))
      .returning();
    return category || undefined;
  }

  async deleteExpenseCategory(id: string): Promise<boolean> {
    const [category] = await db
      .update(expenseCategories)
      .set({ isActive: false })
      .where(eq(expenseCategories.id, id))
      .returning();
    return !!category;
  }

  // Expense management
  async getExpenses(): Promise<ExpenseWithCategory[]> {
    const expensesList = await db.select().from(expenses)
      .orderBy(desc(expenses.createdAt));
    
    const result = [];
    for (const expense of expensesList) {
      const [category] = await db.select().from(expenseCategories)
        .where(eq(expenseCategories.id, expense.categoryId));
      const [bankAccount] = expense.bankAccountId ? 
        await db.select().from(bankAccounts).where(eq(bankAccounts.id, expense.bankAccountId)) : [null];
      
      result.push({ 
        ...expense, 
        category: category || null, 
        bankAccount: bankAccount || null 
      });
    }
    return result as ExpenseWithCategory[];
  }

  async getExpense(id: string): Promise<ExpenseWithCategory | undefined> {
    const [expense] = await db.select().from(expenses)
      .where(eq(expenses.id, id));
    
    if (!expense) return undefined;
    
    const [category] = await db.select().from(expenseCategories)
      .where(eq(expenseCategories.id, expense.categoryId));
    const [bankAccount] = expense.bankAccountId ? 
      await db.select().from(bankAccounts).where(eq(bankAccounts.id, expense.bankAccountId)) : [null];
    
    return { 
      ...expense, 
      category: category || null, 
      bankAccount: bankAccount || null 
    } as ExpenseWithCategory;
  }

  async createExpense(insertExpense: InsertExpense): Promise<ExpenseWithCategory> {
    const [expense] = await db.insert(expenses).values(insertExpense).returning();
    
    const [category] = await db.select().from(expenseCategories)
      .where(eq(expenseCategories.id, expense.categoryId));
    const [bankAccount] = expense.bankAccountId ? 
      await db.select().from(bankAccounts).where(eq(bankAccounts.id, expense.bankAccountId)) : [null];
    
    return { 
      ...expense, 
      category: category || null, 
      bankAccount: bankAccount || null 
    } as ExpenseWithCategory;
  }

  // Ledger and book management (simplified implementations)
  async getCashbook(): Promise<CashbookEntry[]> {
    return await db.select().from(cashbook).orderBy(desc(cashbook.date));
  }

  async getBankbook(bankAccountId?: string): Promise<BankbookEntry[]> {
    const query = db.select().from(bankbook);
    if (bankAccountId) {
      query.where(eq(bankbook.bankAccountId, bankAccountId));
    }
    return await query.orderBy(desc(bankbook.date));
  }

  async getVendorLedger(vendorId: string): Promise<any[]> {
    return [];
  }

  async getRetailerLedger(retailerId: string): Promise<any[]> {
    return [];
  }

  async getUdhaaarBook(): Promise<any[]> {
    return [];
  }

  async getCrateLedger(retailerId?: string): Promise<any[]> {
    return [];
  }

  // Dashboard KPIs (simplified implementation)
  async getDashboardKPIs(): Promise<any> {
    const vendorsList = await db.select().from(vendors).where(eq(vendors.isActive, true));
    const retailersList = await db.select().from(retailers).where(eq(retailers.isActive, true));
    const purchaseInvoicesList = await db.select().from(purchaseInvoices);
    const salesInvoicesList = await db.select().from(salesInvoices);
    const pendingInvoicesList = await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.status, "Partially Paid"));
    
    // Calculate total stock value (simplified)
    const stockItems = await db.select().from(stock);
    let totalStockValue = 0;
    let totalStockKgs = 0;
    
    stockItems.forEach(item => {
      const kgs = parseFloat(item.quantityInKgs || "0");
      totalStockKgs += kgs;
      // Estimate stock value at average rate of 40 per kg
      totalStockValue += kgs * 40;
    });
    
    return {
      todaySales: "₹45,250.00", // Mock data for today's sales
      pendingPayments: "₹18,500.00", // Mock data for pending payments
      pendingInvoicesCount: pendingInvoicesList.length,
      activeVendors: vendorsList.length,
      stockValue: `₹${totalStockValue.toLocaleString('en-IN')}.00`,
      totalStockKgs: `${totalStockKgs.toFixed(0)} kg`
    };
  }
}

export const storage = new DatabaseStorage();