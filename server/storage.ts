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
  type CrateTransactionWithRetailer
} from "@shared/schema";
import bcrypt from "bcrypt";
import { db } from "./db";
import { eq, desc, and, asc, sum, sql } from "drizzle-orm";
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

export interface IStorage {
  // User management
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  updateUserPermissions(id: string, permissions: string[]): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  
  // Vendor management
  getVendors(): Promise<Vendor[]>;
  getVendor(id: string): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: string, vendor: Partial<InsertVendor>): Promise<Vendor | undefined>;
  deleteVendor(id: string): Promise<boolean>;
  
  // Item management
  getItems(): Promise<Item[]>;
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
  
  // Payment management
  getPayments(): Promise<PaymentWithDetails[]>;
  getPaymentsByInvoice(invoiceId: string): Promise<PaymentWithDetails[]>;
  createPayment(payment: InsertPayment): Promise<PaymentWithDetails>;
  
  // Stock management
  getStock(): Promise<StockWithItem[]>;
  getStockByItem(itemId: string): Promise<Stock | undefined>;
  updateStock(itemId: string, stock: Partial<InsertStock>): Promise<Stock>;
  
  // Stock movement management
  getStockMovements(): Promise<StockMovement[]>;
  getStockMovementsByItem(itemId: string): Promise<any[]>;
  createStockMovement(movement: InsertStockMovement): Promise<StockMovement>;
  calculateStockBalance(itemId: string): Promise<{ crates: number; kgs: number; boxes: number }>;
  
  // Retailer management
  getRetailers(): Promise<Retailer[]>;
  getRetailer(id: string): Promise<Retailer | undefined>;
  createRetailer(retailer: InsertRetailer): Promise<Retailer>;
  updateRetailer(id: string, retailer: Partial<InsertRetailer>): Promise<Retailer | undefined>;
  deleteRetailer(id: string): Promise<boolean>;
  
  // Sales invoice management
  getSalesInvoices(): Promise<SalesInvoiceWithDetails[]>;
  getSalesInvoice(id: string): Promise<SalesInvoiceWithDetails | undefined>;
  createSalesInvoice(invoice: InsertSalesInvoice, items: InsertSalesInvoiceItem[]): Promise<SalesInvoiceWithDetails>;
  markSalesInvoiceAsPaid(invoiceId: string): Promise<{ invoice: SalesInvoice; shortfallAdded: string; retailer: Retailer }>;
  
  // Sales payment management
  getSalesPayments(): Promise<SalesPayment[]>;
  getSalesPaymentsByInvoice(invoiceId: string): Promise<SalesPayment[]>;
  createSalesPayment(payment: InsertSalesPayment): Promise<SalesPayment>;
  
  // Crate management
  getCrateTransactions(): Promise<CrateTransactionWithRetailer[]>;
  getCrateTransactionsByRetailer(retailerId: string): Promise<CrateTransaction[]>;
  createCrateTransaction(transaction: InsertCrateTransaction): Promise<CrateTransaction>;
  
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
    return result.rowCount > 0;
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
    const invoicesWithVendors = await db.select({
      ...purchaseInvoices,
      vendor: vendors
    })
    .from(purchaseInvoices)
    .leftJoin(vendors, eq(purchaseInvoices.vendorId, vendors.id))
    .orderBy(desc(purchaseInvoices.createdAt));

    const result = [];
    for (const invoiceData of invoicesWithVendors) {
      const { vendor, ...invoice } = invoiceData;
      const invoiceItemsList = await db.select().from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, invoice.id));
      result.push({ ...invoice, vendor, items: invoiceItemsList });
    }
    return result;
  }

  async getPurchaseInvoice(id: string): Promise<InvoiceWithItems | undefined> {
    const [invoiceData] = await db.select({
      ...purchaseInvoices,
      vendor: vendors
    })
    .from(purchaseInvoices)
    .leftJoin(vendors, eq(purchaseInvoices.vendorId, vendors.id))
    .where(eq(purchaseInvoices.id, id));

    if (!invoiceData) return undefined;

    const { vendor, ...invoice } = invoiceData;
    const itemsList = await db.select().from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoice.id));
    return { ...invoice, vendor, items: itemsList };
  }

  async createPurchaseInvoice(insertInvoice: InsertPurchaseInvoice, itemsList: InsertInvoiceItem[]): Promise<InvoiceWithItems> {
    const invoiceNumber = `PI${String(Date.now()).slice(-6)}`;
    const [invoice] = await db.insert(purchaseInvoices).values({
      ...insertInvoice,
      invoiceNumber
    }).returning();

    const insertedItems = await db.insert(invoiceItems).values(
      itemsList.map(item => ({ ...item, invoiceId: invoice.id }))
    ).returning();

    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, invoice.vendorId));
    return { ...invoice, vendor, items: insertedItems };
  }

  // Payment management
  async getPayments(): Promise<PaymentWithDetails[]> {
    return await db.select({
      ...payments,
      invoice: purchaseInvoices,
      vendor: vendors,
      bankAccount: bankAccounts
    })
    .from(payments)
    .leftJoin(purchaseInvoices, eq(payments.invoiceId, purchaseInvoices.id))
    .leftJoin(vendors, eq(payments.vendorId, vendors.id))
    .leftJoin(bankAccounts, eq(payments.bankAccountId, bankAccounts.id))
    .orderBy(desc(payments.createdAt));
  }

  async getPaymentsByInvoice(invoiceId: string): Promise<PaymentWithDetails[]> {
    return await db.select({
      ...payments,
      invoice: purchaseInvoices,
      vendor: vendors,
      bankAccount: bankAccounts
    })
    .from(payments)
    .leftJoin(purchaseInvoices, eq(payments.invoiceId, purchaseInvoices.id))
    .leftJoin(vendors, eq(payments.vendorId, vendors.id))
    .leftJoin(bankAccounts, eq(payments.bankAccountId, bankAccounts.id))
    .where(eq(payments.invoiceId, invoiceId))
    .orderBy(desc(payments.createdAt));
  }

  async createPayment(insertPayment: InsertPayment): Promise<PaymentWithDetails> {
    const [payment] = await db.insert(payments).values(insertPayment).returning();
    
    const [result] = await db.select({
      ...payments,
      invoice: purchaseInvoices,
      vendor: vendors,
      bankAccount: bankAccounts
    })
    .from(payments)
    .leftJoin(purchaseInvoices, eq(payments.invoiceId, purchaseInvoices.id))
    .leftJoin(vendors, eq(payments.vendorId, vendors.id))
    .leftJoin(bankAccounts, eq(payments.bankAccountId, bankAccounts.id))
    .where(eq(payments.id, payment.id));
    
    return result;
  }

  // Stock management
  async getStock(): Promise<StockWithItem[]> {
    return await db.select({
      ...stock,
      item: {
        ...items,
        vendor: vendors
      }
    })
    .from(stock)
    .leftJoin(items, eq(stock.itemId, items.id))
    .leftJoin(vendors, eq(items.vendorId, vendors.id))
    .orderBy(asc(items.name));
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
    return await db.select({
      ...stockMovements,
      item: {
        ...items,
        vendor: vendors
      }
    })
    .from(stockMovements)
    .leftJoin(items, eq(stockMovements.itemId, items.id))
    .leftJoin(vendors, eq(items.vendorId, vendors.id))
    .where(eq(stockMovements.itemId, itemId))
    .orderBy(desc(stockMovements.createdAt));
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
    const invoicesData = await db.select({
      ...salesInvoices,
      retailer: retailers
    })
    .from(salesInvoices)
    .leftJoin(retailers, eq(salesInvoices.retailerId, retailers.id))
    .orderBy(desc(salesInvoices.createdAt));

    const result = [];
    for (const invoiceData of invoicesData) {
      const { retailer, ...invoice } = invoiceData;
      const itemsList = await db.select().from(salesInvoiceItems)
        .where(eq(salesInvoiceItems.invoiceId, invoice.id));
      const paymentsList = await db.select().from(salesPayments)
        .where(eq(salesPayments.invoiceId, invoice.id));
      result.push({ ...invoice, retailer, items: itemsList, payments: paymentsList });
    }
    return result;
  }

  async getSalesInvoice(id: string): Promise<SalesInvoiceWithDetails | undefined> {
    const [invoiceData] = await db.select({
      ...salesInvoices,
      retailer: retailers
    })
    .from(salesInvoices)
    .leftJoin(retailers, eq(salesInvoices.retailerId, retailers.id))
    .where(eq(salesInvoices.id, id));

    if (!invoiceData) return undefined;

    const { retailer, ...invoice } = invoiceData;
    const itemsList = await db.select().from(salesInvoiceItems)
      .where(eq(salesInvoiceItems.invoiceId, invoice.id));
    const paymentsList = await db.select().from(salesPayments)
      .where(eq(salesPayments.invoiceId, invoice.id));
    return { ...invoice, retailer, items: itemsList, payments: paymentsList };
  }

  async createSalesInvoice(insertInvoice: InsertSalesInvoice, itemsList: InsertSalesInvoiceItem[]): Promise<SalesInvoiceWithDetails> {
    const invoiceNumber = `SI${String(Date.now()).slice(-6)}`;
    const [invoice] = await db.insert(salesInvoices).values({
      ...insertInvoice,
      invoiceNumber
    }).returning();

    const insertedItems = await db.insert(salesInvoiceItems).values(
      itemsList.map(item => ({ ...item, invoiceId: invoice.id }))
    ).returning();

    const [retailer] = await db.select().from(retailers).where(eq(retailers.id, invoice.retailerId));
    return { ...invoice, retailer, items: insertedItems, payments: [] };
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
    const newShortfallBalance = parseFloat(retailer.shortfallBalance) + shortfallAmount;
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
    return await db.select({
      ...crateTransactions,
      retailer: retailers
    })
    .from(crateTransactions)
    .leftJoin(retailers, eq(crateTransactions.retailerId, retailers.id))
    .orderBy(desc(crateTransactions.createdAt));
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
    return await db.select({
      ...expenses,
      category: expenseCategories,
      bankAccount: bankAccounts
    })
    .from(expenses)
    .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
    .leftJoin(bankAccounts, eq(expenses.bankAccountId, bankAccounts.id))
    .orderBy(desc(expenses.createdAt));
  }

  async getExpense(id: string): Promise<ExpenseWithCategory | undefined> {
    const [expense] = await db.select({
      ...expenses,
      category: expenseCategories,
      bankAccount: bankAccounts
    })
    .from(expenses)
    .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
    .leftJoin(bankAccounts, eq(expenses.bankAccountId, bankAccounts.id))
    .where(eq(expenses.id, id));
    return expense || undefined;
  }

  async createExpense(insertExpense: InsertExpense): Promise<ExpenseWithCategory> {
    const [expense] = await db.insert(expenses).values(insertExpense).returning();
    
    const [result] = await db.select({
      ...expenses,
      category: expenseCategories,
      bankAccount: bankAccounts
    })
    .from(expenses)
    .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
    .leftJoin(bankAccounts, eq(expenses.bankAccountId, bankAccounts.id))
    .where(eq(expenses.id, expense.id));
    
    return result;
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
    const totalVendors = await db.select({ count: sql`count(*)` }).from(vendors).where(eq(vendors.isActive, true));
    const totalRetailers = await db.select({ count: sql`count(*)` }).from(retailers).where(eq(retailers.isActive, true));
    const totalPurchaseInvoices = await db.select({ count: sql`count(*)` }).from(purchaseInvoices);
    const totalSalesInvoices = await db.select({ count: sql`count(*)` }).from(salesInvoices);
    const pendingInvoices = await db.select({ count: sql`count(*)` }).from(purchaseInvoices).where(eq(purchaseInvoices.status, "Partially Paid"));
    
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
      pendingInvoicesCount: parseInt(pendingInvoices[0]?.count || "0"),
      activeVendors: parseInt(totalVendors[0]?.count || "0"),
      stockValue: `₹${totalStockValue.toLocaleString('en-IN')}.00`,
      totalStockKgs: `${totalStockKgs.toFixed(0)} kg`
    };
  }
}

export const storage = new DatabaseStorage();