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
  type CashbookEntry,
  type BankbookEntry,
  type InvoiceWithItems,
  type PaymentWithDetails,
  type StockWithItem
} from "@shared/schema";
import { ROLE_PERMISSIONS } from "@shared/permissions";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

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
  
  // Ledger and book management
  getCashbook(): Promise<CashbookEntry[]>;
  getBankbook(bankAccountId?: string): Promise<BankbookEntry[]>;
  getVendorLedger(vendorId: string): Promise<any[]>;
  
  // Dashboard KPIs
  getDashboardKPIs(): Promise<any>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private vendors: Map<string, Vendor> = new Map();
  private items: Map<string, Item> = new Map();
  private bankAccounts: Map<string, BankAccount> = new Map();
  private purchaseInvoices: Map<string, PurchaseInvoice> = new Map();
  private invoiceItems: Map<string, InvoiceItem> = new Map();
  private payments: Map<string, Payment> = new Map();
  private stock: Map<string, Stock> = new Map();
  private cashbook: Map<string, CashbookEntry> = new Map();
  private bankbook: Map<string, BankbookEntry> = new Map();
  
  private invoiceCounter = 1;

  constructor() {
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    // Create default admin user
    const hashedPassword = await bcrypt.hash("admin123", 10);
    const admin: User = {
      id: randomUUID(),
      username: "admin",
      password: hashedPassword,
      role: "Admin",
      name: "System Administrator",
      permissions: ROLE_PERMISSIONS.Admin,
      createdAt: new Date(),
    };
    this.users.set(admin.id, admin);

    // Create sample vendors
    const vendor1: Vendor = {
      id: randomUUID(),
      name: "Ramesh Fruit Supplier",
      contactPerson: "Ramesh Kumar",
      phone: "9876543210",
      address: "Market Road, Mumbai",
      gstNumber: "27ABCDE1234F1Z5",
      panNumber: "ABCDE1234F",
      balance: "0.00",
      isActive: true,
      createdAt: new Date(),
    };
    this.vendors.set(vendor1.id, vendor1);

    // Create sample items
    const item1: Item = {
      id: randomUUID(),
      name: "Mangoes",
      quality: "A-Grade",
      vendorId: vendor1.id,
      isActive: true,
      createdAt: new Date(),
    };
    this.items.set(item1.id, item1);

    // Initialize stock for the item
    const stock1: Stock = {
      id: randomUUID(),
      itemId: item1.id,
      quantityInCrates: "0.00",
      quantityInKgs: "0.00",
      lastUpdated: new Date(),
    };
    this.stock.set(stock1.id, stock1);

    // Create sample bank account
    const bank1: BankAccount = {
      id: randomUUID(),
      name: "Business Current Account",
      accountNumber: "1234567890",
      bankName: "State Bank of India",
      ifscCode: "SBIN0001234",
      balance: "50000.00",
      isActive: true,
      createdAt: new Date(),
    };
    this.bankAccounts.set(bank1.id, bank1);
  }

  // User methods
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    // Set default permissions based on role
    const defaultPermissions = ROLE_PERMISSIONS[insertUser.role as keyof typeof ROLE_PERMISSIONS] || [];
    const user: User = {
      ...insertUser,
      id: randomUUID(),
      password: hashedPassword,
      permissions: defaultPermissions,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: string, updateData: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updateDataWithHashedPassword = { ...updateData };
    if (updateData.password) {
      updateDataWithHashedPassword.password = await bcrypt.hash(updateData.password, 10);
    }
    
    const updated = { ...user, ...updateDataWithHashedPassword };
    this.users.set(id, updated);
    return updated;
  }

  async updateUserPermissions(id: string, permissions: string[]): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updated = { ...user, permissions };
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  // Vendor methods
  async getVendors(): Promise<Vendor[]> {
    return Array.from(this.vendors.values()).filter(v => v.isActive);
  }

  async getVendor(id: string): Promise<Vendor | undefined> {
    return this.vendors.get(id);
  }

  async createVendor(insertVendor: InsertVendor): Promise<Vendor> {
    const vendor: Vendor = {
      ...insertVendor,
      id: randomUUID(),
      balance: "0.00",
      createdAt: new Date(),
    };
    this.vendors.set(vendor.id, vendor);
    return vendor;
  }

  async updateVendor(id: string, updateData: Partial<InsertVendor>): Promise<Vendor | undefined> {
    const vendor = this.vendors.get(id);
    if (!vendor) return undefined;
    
    const updated = { ...vendor, ...updateData };
    this.vendors.set(id, updated);
    return updated;
  }

  async deleteVendor(id: string): Promise<boolean> {
    const vendor = this.vendors.get(id);
    if (!vendor) return false;
    
    vendor.isActive = false;
    this.vendors.set(id, vendor);
    return true;
  }

  // Item methods
  async getItems(): Promise<Item[]> {
    return Array.from(this.items.values()).filter(c => c.isActive);
  }

  async getItemsByVendor(vendorId: string): Promise<Item[]> {
    return Array.from(this.items.values())
      .filter(c => c.vendorId === vendorId && c.isActive);
  }

  async getItem(id: string): Promise<Item | undefined> {
    return this.items.get(id);
  }

  async createItem(insertItem: InsertItem): Promise<Item> {
    const item: Item = {
      ...insertItem,
      id: randomUUID(),
      createdAt: new Date(),
    };
    this.items.set(item.id, item);

    // Initialize stock for new item
    const stock: Stock = {
      id: randomUUID(),
      itemId: item.id,
      quantityInCrates: "0.00",
      quantityInKgs: "0.00",
      lastUpdated: new Date(),
    };
    this.stock.set(stock.id, stock);

    return item;
  }

  async updateItem(id: string, updateData: Partial<InsertItem>): Promise<Item | undefined> {
    const item = this.items.get(id);
    if (!item) return undefined;
    
    const updated = { ...item, ...updateData };
    this.items.set(id, updated);
    return updated;
  }

  async deleteItem(id: string): Promise<boolean> {
    const item = this.items.get(id);
    if (!item) return false;
    
    item.isActive = false;
    this.items.set(id, item);
    return true;
  }

  // Bank account methods
  async getBankAccounts(): Promise<BankAccount[]> {
    return Array.from(this.bankAccounts.values()).filter(b => b.isActive);
  }

  async getBankAccount(id: string): Promise<BankAccount | undefined> {
    return this.bankAccounts.get(id);
  }

  async createBankAccount(insertAccount: InsertBankAccount): Promise<BankAccount> {
    const account: BankAccount = {
      ...insertAccount,
      id: randomUUID(),
      balance: "0.00",
      createdAt: new Date(),
    };
    this.bankAccounts.set(account.id, account);
    return account;
  }

  async updateBankAccount(id: string, updateData: Partial<InsertBankAccount>): Promise<BankAccount | undefined> {
    const account = this.bankAccounts.get(id);
    if (!account) return undefined;
    
    const updated = { ...account, ...updateData };
    this.bankAccounts.set(id, updated);
    return updated;
  }

  // Purchase invoice methods
  async getPurchaseInvoices(): Promise<InvoiceWithItems[]> {
    const invoices = Array.from(this.purchaseInvoices.values());
    return invoices.map(invoice => ({
      ...invoice,
      items: Array.from(this.invoiceItems.values()).filter(item => item.invoiceId === invoice.id),
      vendor: this.vendors.get(invoice.vendorId)!,
    }));
  }

  async getPurchaseInvoice(id: string): Promise<InvoiceWithItems | undefined> {
    const invoice = this.purchaseInvoices.get(id);
    if (!invoice) return undefined;

    return {
      ...invoice,
      items: Array.from(this.invoiceItems.values()).filter(item => item.invoiceId === id),
      vendor: this.vendors.get(invoice.vendorId)!,
    };
  }

  async createPurchaseInvoice(insertInvoice: InsertPurchaseInvoice, items: InsertInvoiceItem[]): Promise<InvoiceWithItems> {
    const invoiceNumber = `INV-${new Date().getFullYear()}-${this.invoiceCounter.toString().padStart(3, '0')}`;
    this.invoiceCounter++;

    const balanceAmount = (parseFloat(insertInvoice.netAmount) - 0).toFixed(2);
    const status = parseFloat(balanceAmount) === 0 ? "Paid" : "Unpaid";

    const invoice: PurchaseInvoice = {
      ...insertInvoice,
      id: randomUUID(),
      invoiceNumber,
      paidAmount: "0.00",
      balanceAmount,
      status,
      createdAt: new Date(),
    };
    this.purchaseInvoices.set(invoice.id, invoice);

    // Create invoice items
    const createdItems: InvoiceItem[] = [];
    for (const item of items) {
      const invoiceItem: InvoiceItem = {
        ...item,
        id: randomUUID(),
        invoiceId: invoice.id,
        createdAt: new Date(),
      };
      this.invoiceItems.set(invoiceItem.id, invoiceItem);
      createdItems.push(invoiceItem);

      // Update stock
      await this.updateStockFromInvoiceItem(invoiceItem);
    }

    // Update vendor balance
    const vendor = this.vendors.get(invoice.vendorId);
    if (vendor) {
      vendor.balance = (parseFloat(vendor.balance!) + parseFloat(invoice.netAmount)).toFixed(2);
      this.vendors.set(vendor.id, vendor);
    }

    return {
      ...invoice,
      items: createdItems,
      vendor: this.vendors.get(invoice.vendorId)!,
    };
  }

  private async updateStockFromInvoiceItem(invoiceItem: InvoiceItem): Promise<void> {
    const stockEntry = Array.from(this.stock.values()).find(s => s.itemId === invoiceItem.itemId);
    if (!stockEntry) return;

    // For invoice items, we use weight directly instead of checking unit
    stockEntry.quantityInKgs = (parseFloat(stockEntry.quantityInKgs!) + parseFloat(invoiceItem.weight)).toFixed(2);

    stockEntry.lastUpdated = new Date();
    this.stock.set(stockEntry.id, stockEntry);
  }

  // Payment methods
  async getPayments(): Promise<PaymentWithDetails[]> {
    const payments = Array.from(this.payments.values());
    return payments.map(payment => ({
      ...payment,
      invoice: this.purchaseInvoices.get(payment.invoiceId)!,
      vendor: this.vendors.get(payment.vendorId)!,
      bankAccount: payment.bankAccountId ? this.bankAccounts.get(payment.bankAccountId) : undefined,
    }));
  }

  async getPaymentsByInvoice(invoiceId: string): Promise<PaymentWithDetails[]> {
    const payments = Array.from(this.payments.values()).filter(p => p.invoiceId === invoiceId);
    return payments.map(payment => ({
      ...payment,
      invoice: this.purchaseInvoices.get(payment.invoiceId)!,
      vendor: this.vendors.get(payment.vendorId)!,
      bankAccount: payment.bankAccountId ? this.bankAccounts.get(payment.bankAccountId) : undefined,
    }));
  }

  async createPayment(insertPayment: InsertPayment): Promise<PaymentWithDetails> {
    const payment: Payment = {
      ...insertPayment,
      id: randomUUID(),
      createdAt: new Date(),
    };
    this.payments.set(payment.id, payment);

    // Update invoice payment status
    const invoice = this.purchaseInvoices.get(payment.invoiceId);
    if (invoice) {
      const newPaidAmount = (parseFloat(invoice.paidAmount) + parseFloat(payment.amount)).toFixed(2);
      const newBalanceAmount = (parseFloat(invoice.netAmount) - parseFloat(newPaidAmount)).toFixed(2);
      
      let status = "Unpaid";
      if (parseFloat(newBalanceAmount) === 0) {
        status = "Paid";
      } else if (parseFloat(newPaidAmount) > 0) {
        status = "Partially Paid";
      }

      invoice.paidAmount = newPaidAmount;
      invoice.balanceAmount = newBalanceAmount;
      invoice.status = status;
      this.purchaseInvoices.set(invoice.id, invoice);
    }

    // Update vendor balance
    const vendor = this.vendors.get(payment.vendorId);
    if (vendor) {
      vendor.balance = (parseFloat(vendor.balance!) - parseFloat(payment.amount)).toFixed(2);
      this.vendors.set(vendor.id, vendor);
    }

    // Update cashbook/bankbook
    await this.updateBooksFromPayment(payment);

    return {
      ...payment,
      invoice: this.purchaseInvoices.get(payment.invoiceId)!,
      vendor: this.vendors.get(payment.vendorId)!,
      bankAccount: payment.bankAccountId ? this.bankAccounts.get(payment.bankAccountId) : undefined,
    };
  }

  private async updateBooksFromPayment(payment: Payment): Promise<void> {
    const vendor = this.vendors.get(payment.vendorId);
    const description = `Payment to ${vendor?.name} - ${payment.paymentMode}`;

    if (payment.paymentMode === "Cash") {
      // Update cashbook
      const cashEntry: CashbookEntry = {
        id: randomUUID(),
        date: payment.paymentDate,
        description,
        inflow: "0.00",
        outflow: payment.amount,
        balance: "0.00", // Will be calculated
        referenceType: "Payment",
        referenceId: payment.id,
        createdAt: new Date(),
      };

      // Calculate balance (this is simplified - in real implementation, get last balance)
      const lastCashEntry = Array.from(this.cashbook.values()).sort((a, b) => 
        new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
      )[0];
      
      const lastBalance = lastCashEntry ? parseFloat(lastCashEntry.balance!) : 0;
      cashEntry.balance = (lastBalance - parseFloat(payment.amount)).toFixed(2);
      
      this.cashbook.set(cashEntry.id, cashEntry);
    } else if (payment.bankAccountId) {
      // Update bankbook
      const bankEntry: BankbookEntry = {
        id: randomUUID(),
        bankAccountId: payment.bankAccountId,
        date: payment.paymentDate,
        description,
        debit: payment.amount,
        credit: "0.00",
        balance: "0.00", // Will be calculated
        referenceType: "Payment",
        referenceId: payment.id,
        createdAt: new Date(),
      };

      // Update bank account balance
      const bankAccount = this.bankAccounts.get(payment.bankAccountId);
      if (bankAccount) {
        bankAccount.balance = (parseFloat(bankAccount.balance) - parseFloat(payment.amount)).toFixed(2);
        this.bankAccounts.set(bankAccount.id, bankAccount);
        bankEntry.balance = bankAccount.balance;
      }

      this.bankbook.set(bankEntry.id, bankEntry);
    }
  }

  // Stock methods
  async getStock(): Promise<StockWithItem[]> {
    const stocks = Array.from(this.stock.values());
    return stocks.map(stock => {
      const item = this.items.get(stock.itemId!)!;
      const vendor = this.vendors.get(item.vendorId!)!;
      return {
        ...stock,
        item: {
          ...item,
          vendor,
        },
      };
    });
  }

  async getStockByItem(itemId: string): Promise<Stock | undefined> {
    return Array.from(this.stock.values()).find(s => s.itemId === itemId);
  }

  async updateStock(itemId: string, updateData: Partial<InsertStock>): Promise<Stock> {
    const stockEntry = Array.from(this.stock.values()).find(s => s.itemId === itemId);
    if (!stockEntry) {
      // Create new stock entry
      const newStock: Stock = {
        id: randomUUID(),
        itemId,
        quantityInCrates: updateData.quantityInCrates || "0.00",
        quantityInKgs: updateData.quantityInKgs || "0.00",
        lastUpdated: new Date(),
      };
      this.stock.set(newStock.id, newStock);
      return newStock;
    }

    const updated = { ...stockEntry, ...updateData, lastUpdated: new Date() };
    this.stock.set(stockEntry.id, updated);
    return updated;
  }

  // Book methods
  async getCashbook(): Promise<CashbookEntry[]> {
    return Array.from(this.cashbook.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  async getBankbook(bankAccountId?: string): Promise<BankbookEntry[]> {
    let entries = Array.from(this.bankbook.values());
    if (bankAccountId) {
      entries = entries.filter(e => e.bankAccountId === bankAccountId);
    }
    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getVendorLedger(vendorId: string): Promise<any[]> {
    const invoices = Array.from(this.purchaseInvoices.values()).filter(i => i.vendorId === vendorId);
    const payments = Array.from(this.payments.values()).filter(p => p.vendorId === vendorId);

    const ledgerEntries = [
      ...invoices.map(invoice => ({
        date: invoice.invoiceDate,
        description: `Invoice ${invoice.invoiceNumber}`,
        debit: invoice.netAmount,
        credit: "0.00",
        type: "invoice",
        reference: invoice.id,
      })),
      ...payments.map(payment => ({
        date: payment.paymentDate,
        description: `Payment - ${payment.paymentMode}`,
        debit: "0.00",
        credit: payment.amount,
        type: "payment",
        reference: payment.id,
      })),
    ];

    return ledgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async getDashboardKPIs(): Promise<any> {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Today's sales
    const todayInvoices = Array.from(this.purchaseInvoices.values())
      .filter(invoice => new Date(invoice.createdAt!).getTime() >= todayStart.getTime());
    const todaySales = todayInvoices.reduce((sum, invoice) => sum + parseFloat(invoice.netAmount), 0);

    // Pending payments
    const pendingInvoices = Array.from(this.purchaseInvoices.values())
      .filter(invoice => invoice.status !== "Paid");
    const pendingPayments = pendingInvoices.reduce((sum, invoice) => sum + parseFloat(invoice.balanceAmount), 0);

    // Active vendors
    const activeVendors = Array.from(this.vendors.values()).filter(v => v.isActive).length;

    // Stock value (simplified calculation)
    const stocks = Array.from(this.stock.values());
    let stockValue = 0;
    let totalKgs = 0;
    for (const stock of stocks) {
      const item = this.items.get(stock.itemId!);
      if (item) {
        const kgs = parseFloat(stock.quantityInKgs);
        // Since items don't have baseRate, use a default rate of 100 for stock valuation
        const rate = 100; // Default rate for stock value calculation
        stockValue += kgs * rate;
        totalKgs += kgs;
      }
    }

    return {
      todaySales: `₹${todaySales.toLocaleString('en-IN')}`,
      pendingPayments: `₹${pendingPayments.toLocaleString('en-IN')}`,
      pendingInvoicesCount: pendingInvoices.length,
      activeVendors,
      stockValue: `₹${stockValue.toLocaleString('en-IN')}`,
      totalStockKgs: `${totalKgs.toFixed(0)} kg`,
    };
  }
}

export const storage = new MemStorage();
