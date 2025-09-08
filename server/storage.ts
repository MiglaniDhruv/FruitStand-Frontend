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
  
  // Stock movement management
  getStockMovements(): Promise<StockMovement[]>;
  getStockMovementsByItem(itemId: string): Promise<StockMovement[]>;
  createStockMovement(movement: InsertStockMovement): Promise<StockMovement>;
  calculateStockBalance(itemId: string): Promise<{ crates: number; kgs: number }>;
  
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

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private vendors: Map<string, Vendor> = new Map();
  private items: Map<string, Item> = new Map();
  private bankAccounts: Map<string, BankAccount> = new Map();
  private purchaseInvoices: Map<string, PurchaseInvoice> = new Map();
  private invoiceItems: Map<string, InvoiceItem> = new Map();
  private payments: Map<string, Payment> = new Map();
  private stock: Map<string, Stock> = new Map();
  private stockMovements: Map<string, StockMovement> = new Map();
  private cashbook: Map<string, CashbookEntry> = new Map();
  private bankbook: Map<string, BankbookEntry> = new Map();
  private retailers: Map<string, Retailer> = new Map();
  private salesInvoices: Map<string, SalesInvoice> = new Map();
  private salesInvoiceItems: Map<string, SalesInvoiceItem> = new Map();
  private salesPayments: Map<string, SalesPayment> = new Map();
  private crateTransactions: Map<string, CrateTransaction> = new Map();
  private expenseCategories: Map<string, ExpenseCategory> = new Map();
  private expenses: Map<string, Expense> = new Map();
  
  private invoiceCounter = 1;
  private salesInvoiceCounter = 1;

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
      permissions: [...ROLE_PERMISSIONS.Admin],
      createdAt: new Date(),
    };
    this.users.set(admin.id, admin);

    // Create additional users for testing
    const operatorPassword = await bcrypt.hash("operator123", 10);
    const operator: User = {
      id: randomUUID(),
      username: "operator",
      password: operatorPassword,
      role: "Operator",
      name: "Suresh Patil",
      permissions: [...ROLE_PERMISSIONS.Operator],
      createdAt: new Date(),
    };
    this.users.set(operator.id, operator);

    const accountantPassword = await bcrypt.hash("accountant123", 10);
    const accountant: User = {
      id: randomUUID(),
      username: "accountant",
      password: accountantPassword,
      role: "Accountant",
      name: "Priya Sharma",
      permissions: [...ROLE_PERMISSIONS.Accountant],
      createdAt: new Date(),
    };
    this.users.set(accountant.id, accountant);

    // Create multiple vendors
    const vendor1: Vendor = {
      id: randomUUID(),
      name: "Ramesh Fruit Supplier",
      contactPerson: "Ramesh Kumar",
      phone: "9876543210",
      address: "Market Road, Mumbai",
      gstNumber: "27ABCDE1234F1Z5",
      panNumber: "ABCDE1234F",
      balance: "15000.00",
      isActive: true,
      createdAt: new Date(),
    };
    this.vendors.set(vendor1.id, vendor1);

    const vendor2: Vendor = {
      id: randomUUID(),
      name: "Krishna Produce Co.",
      contactPerson: "Krishna Rao",
      phone: "9876543220",
      address: "Wholesale Market, Pune",
      gstNumber: "27ABCDE1234H1Z7",
      panNumber: "ABCDE1234H",
      balance: "8500.00",
      isActive: true,
      createdAt: new Date(),
    };
    this.vendors.set(vendor2.id, vendor2);

    const vendor3: Vendor = {
      id: randomUUID(),
      name: "Mahalakshmi Fruits",
      contactPerson: "Lakshmi Devi",
      phone: "9876543230",
      address: "Fruit Market, Nashik",
      gstNumber: "27ABCDE1234I1Z8",
      panNumber: "ABCDE1234I",
      balance: "22000.00",
      isActive: true,
      createdAt: new Date(),
    };
    this.vendors.set(vendor3.id, vendor3);

    // Create multiple items for different vendors
    const item1: Item = {
      id: randomUUID(),
      name: "Mangoes",
      quality: "A-Grade",
      vendorId: vendor1.id,
      isActive: true,
      createdAt: new Date(),
    };
    this.items.set(item1.id, item1);

    const item2: Item = {
      id: randomUUID(),
      name: "Mangoes",
      quality: "B-Grade",
      vendorId: vendor1.id,
      isActive: true,
      createdAt: new Date(),
    };
    this.items.set(item2.id, item2);

    const item3: Item = {
      id: randomUUID(),
      name: "Apples",
      quality: "Premium",
      vendorId: vendor2.id,
      isActive: true,
      createdAt: new Date(),
    };
    this.items.set(item3.id, item3);

    const item4: Item = {
      id: randomUUID(),
      name: "Oranges",
      quality: "A-Grade",
      vendorId: vendor2.id,
      isActive: true,
      createdAt: new Date(),
    };
    this.items.set(item4.id, item4);

    const item5: Item = {
      id: randomUUID(),
      name: "Grapes",
      quality: "Export Quality",
      vendorId: vendor3.id,
      isActive: true,
      createdAt: new Date(),
    };
    this.items.set(item5.id, item5);

    const item6: Item = {
      id: randomUUID(),
      name: "Pomegranates",
      quality: "A-Grade",
      vendorId: vendor3.id,
      isActive: true,
      createdAt: new Date(),
    };
    this.items.set(item6.id, item6);

    // Initialize stock for all items
    const stockItems = [
      { itemId: item1.id, crates: "45.00", kgs: "1350.00" },
      { itemId: item2.id, crates: "32.00", kgs: "960.00" },
      { itemId: item3.id, crates: "28.00", kgs: "700.00" },
      { itemId: item4.id, crates: "38.00", kgs: "950.00" },
      { itemId: item5.id, crates: "25.00", kgs: "500.00" },
      { itemId: item6.id, crates: "40.00", kgs: "800.00" },
    ];

    stockItems.forEach(stockData => {
      const stock: Stock = {
        id: randomUUID(),
        itemId: stockData.itemId,
        quantityInCrates: stockData.crates,
        quantityInKgs: stockData.kgs,
        lastUpdated: new Date(),
      };
      this.stock.set(stock.id, stock);
    });

    // Create multiple bank accounts
    const bank1: BankAccount = {
      id: randomUUID(),
      name: "Business Current Account",
      accountNumber: "1234567890",
      bankName: "State Bank of India",
      ifscCode: "SBIN0001234",
      balance: "125000.00",
      isActive: true,
      createdAt: new Date(),
    };
    this.bankAccounts.set(bank1.id, bank1);

    const bank2: BankAccount = {
      id: randomUUID(),
      name: "Savings Account",
      accountNumber: "9876543210",
      bankName: "HDFC Bank",
      ifscCode: "HDFC0001234",
      balance: "85000.00",
      isActive: true,
      createdAt: new Date(),
    };
    this.bankAccounts.set(bank2.id, bank2);

    // Create multiple retailers
    const retailer1: Retailer = {
      id: randomUUID(),
      name: "Raj Retail Store",
      contactPerson: "Raj Patel",
      phone: "9876543211",
      address: "Shop No. 15, Market Complex",
      gstNumber: "27ABCDE1234G1Z6",
      panNumber: "ABCDE1234G",
      balance: "5000.00",
      udhaaarBalance: "12000.00",
      shortfallBalance: "0.00",
      crateBalance: 15,
      isActive: true,
      createdAt: new Date(),
    };
    this.retailers.set(retailer1.id, retailer1);

    const retailer2: Retailer = {
      id: randomUUID(),
      name: "Fresh Fruits Mart",
      contactPerson: "Vikram Singh",
      phone: "9876543212",
      address: "Main Road, Sector 7",
      gstNumber: "27ABCDE1234J1Z9",
      panNumber: "ABCDE1234J",
      balance: "8500.00",
      udhaaarBalance: "6000.00",
      shortfallBalance: "1500.00",
      crateBalance: 8,
      isActive: true,
      createdAt: new Date(),
    };
    this.retailers.set(retailer2.id, retailer2);

    const retailer3: Retailer = {
      id: randomUUID(),
      name: "City Fruit Center",
      contactPerson: "Amit Joshi",
      phone: "9876543213",
      address: "Commercial Street, Block A",
      gstNumber: "27ABCDE1234K1Z0",
      panNumber: "ABCDE1234K",
      balance: "3200.00",
      udhaaarBalance: "4500.00",
      shortfallBalance: "0.00",
      crateBalance: 22,
      isActive: true,
      createdAt: new Date(),
    };
    this.retailers.set(retailer3.id, retailer3);

    const retailer4: Retailer = {
      id: randomUUID(),
      name: "Green Valley Fruits",
      contactPerson: "Sunita Mehta",
      phone: "9876543214",
      address: "Garden Plaza, Shop 8",
      gstNumber: "27ABCDE1234L1Z1",
      panNumber: "ABCDE1234L",
      balance: "0.00",
      udhaaarBalance: "0.00",
      shortfallBalance: "0.00",
      crateBalance: 0,
      isActive: true,
      createdAt: new Date(),
    };
    this.retailers.set(retailer4.id, retailer4);

    // Create sample expense categories
    const expenseCategories = [
      { name: "Transport", description: "Transportation and logistics costs" },
      { name: "Labor", description: "Labor and workforce expenses" },
      { name: "Market Fee", description: "Market and commission fees" },
      { name: "Utilities", description: "Electricity, water, and utilities" },
      { name: "Office Expenses", description: "Stationary, office supplies" },
      { name: "Rent", description: "Shop and storage rent" },
      { name: "Maintenance", description: "Equipment and facility maintenance" },
    ];

    expenseCategories.forEach(cat => {
      const category: ExpenseCategory = {
        id: randomUUID(),
        name: cat.name,
        description: cat.description,
        isActive: true,
        createdAt: new Date(),
      };
      this.expenseCategories.set(category.id, category);
    });

    // Create sample purchase invoices with items
    const purchaseInvoice1: PurchaseInvoice = {
      id: randomUUID(),
      invoiceNumber: "PI001",
      vendorId: vendor1.id,
      invoiceDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      commission: "2500.00",
      labour: "800.00",
      truckFreight: "1200.00",
      crateFreight: "400.00",
      postExpenses: "200.00",
      draftExpenses: "150.00",
      vatav: "300.00",
      otherExpenses: "250.00",
      advance: "5000.00",
      totalExpense: "5800.00",
      totalSelling: "45000.00",
      totalLessExpenses: "39200.00",
      netAmount: "36700.00",
      paidAmount: "25000.00",
      balanceAmount: "11700.00",
      status: "Partially Paid",
      createdAt: new Date(),
    };
    this.purchaseInvoices.set(purchaseInvoice1.id, purchaseInvoice1);

    // Invoice items for purchaseInvoice1
    const invoiceItem1: InvoiceItem = {
      id: randomUUID(),
      invoiceId: purchaseInvoice1.id,
      itemId: item1.id,
      quantityInCrates: "30.00",
      quantityInKgs: "900.00",
      pricePerKg: "35.00",
      sellingPricePerKg: "50.00",
      totalAmount: "31500.00",
      totalSellingAmount: "45000.00",
    };
    this.invoiceItems.set(invoiceItem1.id, invoiceItem1);

    const purchaseInvoice2: PurchaseInvoice = {
      id: randomUUID(),
      invoiceNumber: "PI002",
      vendorId: vendor2.id,
      invoiceDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      commission: "1800.00",
      labour: "600.00",
      truckFreight: "900.00",
      crateFreight: "300.00",
      postExpenses: "150.00",
      draftExpenses: "100.00",
      vatav: "200.00",
      otherExpenses: "150.00",
      advance: "3000.00",
      totalExpense: "4200.00",
      totalSelling: "32000.00",
      totalLessExpenses: "27800.00",
      netAmount: "25600.00",
      paidAmount: "25600.00",
      balanceAmount: "0.00",
      status: "Paid",
      createdAt: new Date(),
    };
    this.purchaseInvoices.set(purchaseInvoice2.id, purchaseInvoice2);

    // Invoice items for purchaseInvoice2
    const invoiceItem2: InvoiceItem = {
      id: randomUUID(),
      invoiceId: purchaseInvoice2.id,
      itemId: item3.id,
      quantityInCrates: "20.00",
      quantityInKgs: "500.00",
      pricePerKg: "42.00",
      sellingPricePerKg: "64.00",
      totalAmount: "21000.00",
      totalSellingAmount: "32000.00",
    };
    this.invoiceItems.set(invoiceItem2.id, invoiceItem2);

    // Create sample payments
    const payment1: Payment = {
      id: randomUUID(),
      invoiceId: purchaseInvoice1.id,
      amount: "15000.00",
      paymentMode: "Bank Transfer",
      bankAccountId: bank1.id,
      chequeNumber: null,
      paymentDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      notes: "Partial payment received",
      createdAt: new Date(),
    };
    this.payments.set(payment1.id, payment1);

    const payment2: Payment = {
      id: randomUUID(),
      invoiceId: purchaseInvoice1.id,
      amount: "10000.00",
      paymentMode: "Cash",
      bankAccountId: null,
      chequeNumber: null,
      paymentDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      notes: "Cash payment",
      createdAt: new Date(),
    };
    this.payments.set(payment2.id, payment2);

    const payment3: Payment = {
      id: randomUUID(),
      invoiceId: purchaseInvoice2.id,
      amount: "25600.00",
      paymentMode: "UPI",
      bankAccountId: bank2.id,
      chequeNumber: null,
      paymentDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      notes: "Full payment via UPI",
      createdAt: new Date(),
    };
    this.payments.set(payment3.id, payment3);

    // Create sample sales invoices
    const salesInvoice1: SalesInvoice = {
      id: randomUUID(),
      invoiceNumber: "SI001",
      retailerId: retailer1.id,
      invoiceDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      totalAmount: "18500.00",
      paidAmount: "12000.00",
      balanceAmount: "6500.00",
      status: "Partially Paid",
      createdAt: new Date(),
    };
    this.salesInvoices.set(salesInvoice1.id, salesInvoice1);

    // Sales invoice items
    const salesInvoiceItem1: SalesInvoiceItem = {
      id: randomUUID(),
      invoiceId: salesInvoice1.id,
      itemId: item1.id,
      quantityInCrates: "15.00",
      quantityInKgs: "450.00",
      pricePerKg: "40.00",
      totalAmount: "18000.00",
    };
    this.salesInvoiceItems.set(salesInvoiceItem1.id, salesInvoiceItem1);

    const salesInvoice2: SalesInvoice = {
      id: randomUUID(),
      invoiceNumber: "SI002",
      retailerId: retailer2.id,
      invoiceDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      totalAmount: "14800.00",
      paidAmount: "14800.00",
      balanceAmount: "0.00",
      status: "Paid",
      createdAt: new Date(),
    };
    this.salesInvoices.set(salesInvoice2.id, salesInvoice2);

    // Sales invoice items
    const salesInvoiceItem2: SalesInvoiceItem = {
      id: randomUUID(),
      invoiceId: salesInvoice2.id,
      itemId: item3.id,
      quantityInCrates: "12.00",
      quantityInKgs: "300.00",
      pricePerKg: "48.00",
      totalAmount: "14400.00",
    };
    this.salesInvoiceItems.set(salesInvoiceItem2.id, salesInvoiceItem2);

    // Create sample sales payments
    const salesPayment1: SalesPayment = {
      id: randomUUID(),
      invoiceId: salesInvoice1.id,
      amount: "8000.00",
      paymentMode: "Cash",
      bankAccountId: null,
      chequeNumber: null,
      paymentDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      notes: "Partial cash payment",
      createdAt: new Date(),
    };
    this.salesPayments.set(salesPayment1.id, salesPayment1);

    const salesPayment2: SalesPayment = {
      id: randomUUID(),
      invoiceId: salesInvoice1.id,
      amount: "4000.00",
      paymentMode: "UPI",
      bankAccountId: bank1.id,
      chequeNumber: null,
      paymentDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      notes: "UPI payment",
      createdAt: new Date(),
    };
    this.salesPayments.set(salesPayment2.id, salesPayment2);

    const salesPayment3: SalesPayment = {
      id: randomUUID(),
      invoiceId: salesInvoice2.id,
      amount: "14800.00",
      paymentMode: "Bank Transfer",
      bankAccountId: bank1.id,
      chequeNumber: null,
      paymentDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      notes: "Full payment via bank transfer",
      createdAt: new Date(),
    };
    this.salesPayments.set(salesPayment3.id, salesPayment3);

    // Create sample crate transactions with deposits
    const crateTransaction1: CrateTransaction = {
      id: randomUUID(),
      retailerId: retailer1.id,
      transactionType: "Given",
      quantity: 20,
      transactionDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      salesInvoiceId: salesInvoice1.id,
      depositAmount: "5000.00",
      notes: "Crates given with mango delivery",
      createdAt: new Date(),
    };
    this.crateTransactions.set(crateTransaction1.id, crateTransaction1);

    const crateTransaction2: CrateTransaction = {
      id: randomUUID(),
      retailerId: retailer1.id,
      transactionType: "Returned",
      quantity: 5,
      transactionDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      salesInvoiceId: null,
      depositAmount: "1250.00",
      notes: "Partial crate return with deposit refund",
      createdAt: new Date(),
    };
    this.crateTransactions.set(crateTransaction2.id, crateTransaction2);

    const crateTransaction3: CrateTransaction = {
      id: randomUUID(),
      retailerId: retailer2.id,
      transactionType: "Given",
      quantity: 15,
      transactionDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      salesInvoiceId: salesInvoice2.id,
      depositAmount: "3750.00",
      notes: "Crates given with apple delivery",
      createdAt: new Date(),
    };
    this.crateTransactions.set(crateTransaction3.id, crateTransaction3);

    const crateTransaction4: CrateTransaction = {
      id: randomUUID(),
      retailerId: retailer2.id,
      transactionType: "Returned",
      quantity: 7,
      transactionDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      salesInvoiceId: null,
      depositAmount: "1750.00",
      notes: "Returned crates with deposit refund",
      createdAt: new Date(),
    };
    this.crateTransactions.set(crateTransaction4.id, crateTransaction4);

    const crateTransaction5: CrateTransaction = {
      id: randomUUID(),
      retailerId: retailer3.id,
      transactionType: "Given",
      quantity: 25,
      transactionDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      salesInvoiceId: null,
      depositAmount: "6250.00",
      notes: "Bulk crate delivery with deposit",
      createdAt: new Date(),
    };
    this.crateTransactions.set(crateTransaction5.id, crateTransaction5);

    const crateTransaction6: CrateTransaction = {
      id: randomUUID(),
      retailerId: retailer3.id,
      transactionType: "Returned",
      quantity: 3,
      transactionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      salesInvoiceId: null,
      depositAmount: "750.00",
      notes: "Small return with partial deposit refund",
      createdAt: new Date(),
    };
    this.crateTransactions.set(crateTransaction6.id, crateTransaction6);

    // Create sample expenses
    const transportCategory = Array.from(this.expenseCategories.values()).find(c => c.name === "Transport");
    const laborCategory = Array.from(this.expenseCategories.values()).find(c => c.name === "Labor");
    const marketFeeCategory = Array.from(this.expenseCategories.values()).find(c => c.name === "Market Fee");
    const rentCategory = Array.from(this.expenseCategories.values()).find(c => c.name === "Rent");

    if (transportCategory) {
      const expense1: Expense = {
        id: randomUUID(),
        categoryId: transportCategory.id,
        amount: "2500.00",
        description: "Truck transportation for fruit delivery",
        expenseDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        paymentMode: "Cash",
        bankAccountId: null,
        createdAt: new Date(),
      };
      this.expenses.set(expense1.id, expense1);
    }

    if (laborCategory) {
      const expense2: Expense = {
        id: randomUUID(),
        categoryId: laborCategory.id,
        amount: "1800.00",
        description: "Loading and unloading charges",
        expenseDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        paymentMode: "Cash",
        bankAccountId: null,
        createdAt: new Date(),
      };
      this.expenses.set(expense2.id, expense2);
    }

    if (marketFeeCategory) {
      const expense3: Expense = {
        id: randomUUID(),
        categoryId: marketFeeCategory.id,
        amount: "750.00",
        description: "APMC market fee and commission",
        expenseDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        paymentMode: "Bank Transfer",
        bankAccountId: bank1.id,
        createdAt: new Date(),
      };
      this.expenses.set(expense3.id, expense3);
    }

    if (rentCategory) {
      const expense4: Expense = {
        id: randomUUID(),
        categoryId: rentCategory.id,
        amount: "12000.00",
        description: "Monthly shop rent",
        expenseDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        paymentMode: "Bank Transfer",
        bankAccountId: bank1.id,
        createdAt: new Date(),
      };
      this.expenses.set(expense4.id, expense4);
    }

    // Update invoice counters
    this.invoiceCounter = 3;
    this.salesInvoiceCounter = 3;

    // Create sample stock movements for testing
    const sampleStockMovements = [
      // Stock IN movements from purchase invoices
      {
        itemId: item1.id,
        movementType: "IN" as const,
        quantityInCrates: "30.00",
        quantityInKgs: "900.00",
        referenceType: "PURCHASE_INVOICE",
        referenceId: purchaseInvoice1.id,
        referenceNumber: "PI001",
        vendorId: vendor1.id,
        retailerId: null,
        notes: "Stock received from purchase invoice PI001",
        movementDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        itemId: item3.id,
        movementType: "IN" as const,
        quantityInCrates: "20.00",
        quantityInKgs: "500.00",
        referenceType: "PURCHASE_INVOICE",
        referenceId: purchaseInvoice2.id,
        referenceNumber: "PI002",
        vendorId: vendor2.id,
        retailerId: null,
        notes: "Stock received from purchase invoice PI002",
        movementDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      
      // Manual stock IN entries
      {
        itemId: item2.id,
        movementType: "IN" as const,
        quantityInCrates: "25.00",
        quantityInKgs: "750.00",
        referenceType: "MANUAL_ENTRY",
        referenceId: null,
        referenceNumber: "MANUAL",
        vendorId: vendor1.id,
        retailerId: null,
        notes: "Manual stock entry - direct procurement",
        movementDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      },
      {
        itemId: item5.id,
        movementType: "IN" as const,
        quantityInCrates: "15.00",
        quantityInKgs: "300.00",
        referenceType: "MANUAL_ENTRY",
        referenceId: null,
        referenceNumber: "MANUAL",
        vendorId: vendor3.id,
        retailerId: null,
        notes: "Manual stock entry - warehouse transfer",
        movementDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        itemId: item4.id,
        movementType: "IN" as const,
        quantityInCrates: "18.00",
        quantityInKgs: "450.00",
        referenceType: "MANUAL_ENTRY",
        referenceId: null,
        referenceNumber: "MANUAL",
        vendorId: vendor2.id,
        retailerId: null,
        notes: "Manual stock entry - received from different location",
        movementDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        itemId: item6.id,
        movementType: "IN" as const,
        quantityInCrates: "22.00",
        quantityInKgs: "440.00",
        referenceType: "MANUAL_ENTRY",
        referenceId: null,
        referenceNumber: "MANUAL",
        vendorId: vendor3.id,
        retailerId: null,
        notes: "Manual stock entry - bulk procurement",
        movementDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },

      // Stock OUT movements from sales invoices
      {
        itemId: item1.id,
        movementType: "OUT" as const,
        quantityInCrates: "15.00",
        quantityInKgs: "450.00",
        referenceType: "SALES_INVOICE",
        referenceId: salesInvoice1.id,
        referenceNumber: "SI001",
        vendorId: null,
        retailerId: retailer1.id,
        notes: "Stock sold via sales invoice SI001",
        movementDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        itemId: item3.id,
        movementType: "OUT" as const,
        quantityInCrates: "12.00",
        quantityInKgs: "300.00",
        referenceType: "SALES_INVOICE",
        referenceId: salesInvoice2.id,
        referenceNumber: "SI002",
        vendorId: null,
        retailerId: retailer2.id,
        notes: "Stock sold via sales invoice SI002",
        movementDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },

      // Additional manual OUT entries (returns, damage, etc.)
      {
        itemId: item2.id,
        movementType: "OUT" as const,
        quantityInCrates: "3.00",
        quantityInKgs: "90.00",
        referenceType: "MANUAL_ENTRY",
        referenceId: null,
        referenceNumber: "MANUAL",
        vendorId: null,
        retailerId: null,
        notes: "Manual stock reduction - damaged goods removed",
        movementDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        itemId: item4.id,
        movementType: "OUT" as const,
        quantityInCrates: "5.00",
        quantityInKgs: "125.00",
        referenceType: "MANUAL_ENTRY",
        referenceId: null,
        referenceNumber: "MANUAL",
        vendorId: null,
        retailerId: retailer3.id,
        notes: "Manual stock reduction - direct sale without invoice",
        movementDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        itemId: item5.id,
        movementType: "OUT" as const,
        quantityInCrates: "2.00",
        quantityInKgs: "40.00",
        referenceType: "MANUAL_ENTRY",
        referenceId: null,
        referenceNumber: "MANUAL",
        vendorId: null,
        retailerId: null,
        notes: "Manual stock reduction - spoilage and waste",
        movementDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },

      // More recent stock IN movements
      {
        itemId: item1.id,
        movementType: "IN" as const,
        quantityInCrates: "10.00",
        quantityInKgs: "300.00",
        referenceType: "MANUAL_ENTRY",
        referenceId: null,
        referenceNumber: "MANUAL",
        vendorId: vendor1.id,
        retailerId: null,
        notes: "Manual stock entry - fresh arrival today",
        movementDate: new Date(),
      },
    ];

    // Add all stock movements
    sampleStockMovements.forEach((movementData) => {
      const movement: StockMovement = {
        id: randomUUID(),
        ...movementData,
        createdAt: new Date(),
      };
      this.stockMovements.set(movement.id, movement);
    });

    // Recalculate stock balances for all items after adding movements
    const allItems = Array.from(this.items.values());
    allItems.forEach(async (item) => {
      await this.updateCalculatedStock(item.id);
    });
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
    const defaultPermissions = [...(ROLE_PERMISSIONS[insertUser.role as keyof typeof ROLE_PERMISSIONS] || [])];
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
      isActive: insertVendor.isActive ?? true,
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
    const items = Array.from(this.items.values()).filter(c => c.isActive);
    // Populate vendor information for each item
    return items.map(item => ({
      ...item,
      vendor: this.vendors.get(item.vendorId)
    }));
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
      isActive: insertItem.isActive ?? true,
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

  async createPurchaseInvoice(insertInvoice: InsertPurchaseInvoice, items: InsertInvoiceItem[], stockOutEntryId?: string): Promise<InvoiceWithItems> {
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
      commission: insertInvoice.commission ?? "0.00",
      labour: insertInvoice.labour ?? "0.00",
      truckFreight: insertInvoice.truckFreight ?? "0.00",
      crateFreight: insertInvoice.crateFreight ?? "0.00",
      postExpenses: insertInvoice.postExpenses ?? "0.00",
      draftExpenses: insertInvoice.draftExpenses ?? "0.00",
      vatav: insertInvoice.vatav ?? "0.00",
      otherExpenses: insertInvoice.otherExpenses ?? "0.00",
      advance: insertInvoice.advance ?? "0.00",
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

      // Create Stock IN movement entry
      await this.createStockMovement({
        itemId: invoiceItem.itemId,
        movementType: "IN",
        quantityInCrates: invoiceItem.crates,
        quantityInKgs: invoiceItem.weight,
        referenceType: "PURCHASE_INVOICE",
        referenceId: invoice.id,
        referenceNumber: invoice.invoiceNumber,
        vendorId: invoice.vendorId,
        retailerId: null,
        notes: `Stock received from vendor via purchase invoice ${invoice.invoiceNumber}`,
        movementDate: invoice.invoiceDate,
      });
    }

    // Mark stock out entry as used if stockOutEntryId was provided
    if (stockOutEntryId) {
      const stockOutEntry = this.stockMovements.get(stockOutEntryId);
      if (stockOutEntry) {
        // Update the stock out entry to mark it as used for this purchase invoice
        stockOutEntry.purchaseInvoiceId = invoice.id;
        this.stockMovements.set(stockOutEntryId, stockOutEntry);
      }
    }

    // Update vendor balance
    const vendor = this.vendors.get(invoice.vendorId);
    if (vendor) {
      vendor.balance = (parseFloat(vendor.balance || "0.00") + parseFloat(invoice.netAmount)).toFixed(2);
      this.vendors.set(vendor.id, vendor);
    }

    return {
      ...invoice,
      items: createdItems,
      vendor: this.vendors.get(invoice.vendorId)!,
    };
  }


  // Payment methods
  async getPayments(): Promise<PaymentWithDetails[]> {
    const payments = Array.from(this.payments.values());
    return payments.map(payment => {
      const invoice = this.purchaseInvoices.get(payment.invoiceId);
      const vendor = invoice ? this.vendors.get(invoice.vendorId) : undefined;
      return {
        ...payment,
        invoice: invoice!,
        vendor: vendor!,
        bankAccount: payment.bankAccountId ? this.bankAccounts.get(payment.bankAccountId) : undefined,
      };
    }).filter(payment => payment.invoice && payment.vendor);
  }

  async getPaymentsByInvoice(invoiceId: string): Promise<PaymentWithDetails[]> {
    const payments = Array.from(this.payments.values()).filter(p => p.invoiceId === invoiceId);
    return payments.map(payment => {
      const invoice = this.purchaseInvoices.get(payment.invoiceId);
      const vendor = invoice ? this.vendors.get(invoice.vendorId) : undefined;
      return {
        ...payment,
        invoice: invoice!,
        vendor: vendor!,
        bankAccount: payment.bankAccountId ? this.bankAccounts.get(payment.bankAccountId) : undefined,
      };
    }).filter(payment => payment.invoice && payment.vendor);
  }

  async createPayment(insertPayment: InsertPayment): Promise<PaymentWithDetails> {
    const payment: Payment = {
      ...insertPayment,
      id: randomUUID(),
      bankAccountId: insertPayment.bankAccountId ?? null,
      chequeNumber: insertPayment.chequeNumber ?? null,
      upiReference: insertPayment.upiReference ?? null,
      notes: insertPayment.notes ?? null,
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
      vendor.balance = (parseFloat(vendor.balance || "0.00") - parseFloat(payment.amount)).toFixed(2);
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

  // Stock movement methods
  async getStockMovements(): Promise<StockMovement[]> {
    return Array.from(this.stockMovements.values()).sort((a, b) => 
      new Date(b.movementDate).getTime() - new Date(a.movementDate).getTime()
    );
  }

  async getStockMovementsByItem(itemId: string): Promise<StockMovement[]> {
    return Array.from(this.stockMovements.values())
      .filter(m => m.itemId === itemId)
      .sort((a, b) => new Date(b.movementDate).getTime() - new Date(a.movementDate).getTime());
  }

  async getAvailableStockOutEntriesByVendor(vendorId: string): Promise<StockMovementWithItem[]> {
    const movements = Array.from(this.stockMovements.values())
      .filter(movement => 
        movement.vendorId === vendorId && 
        movement.movementType === "OUT" && 
        movement.referenceType === "SALES_INVOICE" &&
        !movement.purchaseInvoiceId // Only movements not yet used for purchase invoices
      )
      .sort((a, b) => new Date(b.movementDate).getTime() - new Date(a.movementDate).getTime());

    return movements.map(movement => {
      const item = this.items.get(movement.itemId!)!;
      const vendor = this.vendors.get(item.vendorId!)!;
      return {
        ...movement,
        item: {
          ...item,
          vendor,
        },
      };
    });
  }

  async createStockMovement(insertMovement: InsertStockMovement): Promise<StockMovement> {
    const movement: StockMovement = {
      id: randomUUID(),
      ...insertMovement,
      createdAt: new Date(),
    };
    this.stockMovements.set(movement.id, movement);
    
    // Update the calculated stock balance
    await this.updateCalculatedStock(movement.itemId);
    
    return movement;
  }

  async calculateStockBalance(itemId: string): Promise<{ crates: number; kgs: number }> {
    const movements = await this.getStockMovementsByItem(itemId);
    
    let totalCrates = 0;
    let totalKgs = 0;
    
    for (const movement of movements) {
      const crates = parseFloat(movement.quantityInCrates);
      const kgs = parseFloat(movement.quantityInKgs);
      
      if (movement.movementType === "IN") {
        totalCrates += crates;
        totalKgs += kgs;
      } else if (movement.movementType === "OUT") {
        totalCrates -= crates;
        totalKgs -= kgs;
      }
    }
    
    return {
      crates: Math.max(0, totalCrates), // Ensure non-negative
      kgs: Math.max(0, totalKgs)
    };
  }

  private async updateCalculatedStock(itemId: string): Promise<void> {
    const balance = await this.calculateStockBalance(itemId);
    
    // Update or create stock entry with calculated balance
    await this.updateStock(itemId, {
      quantityInCrates: balance.crates.toFixed(2),
      quantityInKgs: balance.kgs.toFixed(2),
    });
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

  // Retailer methods
  async getRetailers(): Promise<Retailer[]> {
    return Array.from(this.retailers.values()).filter(r => r.isActive);
  }

  async getRetailer(id: string): Promise<Retailer | undefined> {
    return this.retailers.get(id);
  }

  async createRetailer(insertRetailer: InsertRetailer): Promise<Retailer> {
    const retailer: Retailer = {
      id: randomUUID(),
      ...insertRetailer,
      balance: "0.00",
      udhaaarBalance: "0.00",
      shortfallBalance: "0.00",
      crateBalance: 0,
      isActive: true,
      createdAt: new Date(),
    };
    this.retailers.set(retailer.id, retailer);
    return retailer;
  }

  async updateRetailer(id: string, updateData: Partial<InsertRetailer>): Promise<Retailer | undefined> {
    const retailer = this.retailers.get(id);
    if (!retailer) return undefined;

    const updated = { ...retailer, ...updateData };
    this.retailers.set(id, updated);
    return updated;
  }

  async deleteRetailer(id: string): Promise<boolean> {
    const retailer = this.retailers.get(id);
    if (!retailer) return false;

    retailer.isActive = false;
    this.retailers.set(id, retailer);
    return true;
  }

  // Sales invoice methods
  async getSalesInvoices(): Promise<SalesInvoiceWithDetails[]> {
    const invoices = Array.from(this.salesInvoices.values());
    return invoices.map(invoice => {
      const retailer = this.retailers.get(invoice.retailerId)!;
      const items = Array.from(this.salesInvoiceItems.values()).filter(item => item.invoiceId === invoice.id);
      const payments = Array.from(this.salesPayments.values()).filter(payment => payment.invoiceId === invoice.id);
      return {
        ...invoice,
        retailer,
        items,
        payments,
      };
    }).sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getSalesInvoice(id: string): Promise<SalesInvoiceWithDetails | undefined> {
    const invoice = this.salesInvoices.get(id);
    if (!invoice) return undefined;

    const retailer = this.retailers.get(invoice.retailerId)!;
    const items = Array.from(this.salesInvoiceItems.values()).filter(item => item.invoiceId === invoice.id);
    const payments = Array.from(this.salesPayments.values()).filter(payment => payment.invoiceId === invoice.id);
    
    return {
      ...invoice,
      retailer,
      items,
      payments,
    };
  }

  async createSalesInvoice(insertInvoice: InsertSalesInvoice, items: InsertSalesInvoiceItem[]): Promise<SalesInvoiceWithDetails> {
    const invoiceNumber = `SI${this.salesInvoiceCounter.toString().padStart(4, '0')}`;
    this.salesInvoiceCounter++;

    const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.amount.toString()), 0);
    
    const invoice: SalesInvoice = {
      id: randomUUID(),
      ...insertInvoice,
      invoiceNumber,
      totalAmount: totalAmount.toFixed(2),
      paidAmount: "0.00",
      balanceAmount: totalAmount.toFixed(2),
      udhaaarAmount: "0.00",
      shortfallAmount: "0.00",
      status: "Unpaid",
      createdAt: new Date(),
    };

    this.salesInvoices.set(invoice.id, invoice);

    // Create invoice items
    const invoiceItems = items.map(item => {
      const invoiceItem: SalesInvoiceItem = {
        id: randomUUID(),
        ...item,
        invoiceId: invoice.id,
        createdAt: new Date(),
      };
      this.salesInvoiceItems.set(invoiceItem.id, invoiceItem);
      return invoiceItem;
    });

    // Create Stock OUT movement entries and validate stock availability
    for (const item of items) {
      const saleWeight = parseFloat(item.weight.toString());
      const saleCrates = parseFloat(item.crates.toString());
      
      // Check current stock balance from movements
      const currentBalance = await this.calculateStockBalance(item.itemId);
      
      // Check if we have enough stock
      if (currentBalance.kgs < saleWeight || currentBalance.crates < saleCrates) {
        throw new Error(`Insufficient stock for item ${item.itemId}. Available: ${currentBalance.kgs} Kgs, ${currentBalance.crates} Crates. Required: ${saleWeight} Kgs, ${saleCrates} Crates`);
      }

      // Create Stock OUT movement entry with rate
      const itemRate = parseFloat(item.rate.toString());
      await this.createStockMovement({
        itemId: item.itemId,
        movementType: "OUT",
        quantityInCrates: item.crates,
        quantityInKgs: item.weight,
        referenceType: "SALES_INVOICE",
        referenceId: invoice.id,
        referenceNumber: invoice.invoiceNumber,
        vendorId: null,
        retailerId: invoice.retailerId,
        rate: itemRate.toFixed(2),
        notes: `Stock sold to retailer via sales invoice ${invoice.invoiceNumber}`,
        movementDate: invoice.invoiceDate,
      });
    }

    const retailer = this.retailers.get(invoice.retailerId)!;
    return {
      ...invoice,
      retailer,
      items: invoiceItems,
      payments: [],
    };
  }

  async markSalesInvoiceAsPaid(invoiceId: string): Promise<{ invoice: SalesInvoice; shortfallAdded: string; retailer: Retailer }> {
    const invoice = this.salesInvoices.get(invoiceId);
    if (!invoice) {
      throw new Error("Sales invoice not found");
    }

    const retailer = this.retailers.get(invoice.retailerId);
    if (!retailer) {
      throw new Error("Retailer not found");
    }

    // Calculate the remaining balance amount
    const remainingAmount = parseFloat(invoice.balanceAmount);
    const shortfallAdded = remainingAmount.toFixed(2);

    // Update invoice status to paid
    invoice.status = "Paid";
    // Keep paid amount the same - do not change it
    invoice.balanceAmount = "0.00"; // Set balance to zero
    invoice.shortfallAmount = shortfallAdded; // Track the shortfall amount

    this.salesInvoices.set(invoiceId, invoice);

    // Update retailer shortfall balance
    const currentShortfall = parseFloat(retailer.shortfallBalance);
    retailer.shortfallBalance = (currentShortfall + remainingAmount).toFixed(2);
    this.retailers.set(retailer.id, retailer);

    return {
      invoice,
      shortfallAdded,
      retailer,
    };
  }

  // Sales payment methods
  async getSalesPayments(): Promise<SalesPayment[]> {
    return Array.from(this.salesPayments.values()).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getSalesPaymentsByInvoice(invoiceId: string): Promise<SalesPayment[]> {
    return Array.from(this.salesPayments.values()).filter(p => p.invoiceId === invoiceId);
  }

  async createSalesPayment(insertPayment: InsertSalesPayment): Promise<SalesPayment> {
    const payment: SalesPayment = {
      id: randomUUID(),
      ...insertPayment,
      createdAt: new Date(),
    };

    this.salesPayments.set(payment.id, payment);

    // Update invoice payment status
    const invoice = this.salesInvoices.get(payment.invoiceId);
    if (invoice) {
      const paidAmount = parseFloat(invoice.paidAmount) + parseFloat(payment.amount.toString());
      const balanceAmount = parseFloat(invoice.totalAmount) - paidAmount;
      
      invoice.paidAmount = paidAmount.toFixed(2);
      invoice.balanceAmount = balanceAmount.toFixed(2);
      
      if (balanceAmount <= 0) {
        invoice.status = "Paid";
      } else if (paidAmount > 0) {
        invoice.status = "Partially Paid";
      }

      this.salesInvoices.set(invoice.id, invoice);
    }

    // Update retailer balance
    const retailer = this.retailers.get(payment.retailerId);
    if (retailer) {
      const currentBalance = parseFloat(retailer.balance);
      retailer.balance = (currentBalance - parseFloat(payment.amount.toString())).toFixed(2);
      this.retailers.set(retailer.id, retailer);
    }

    // Update ledgers
    await this.updateLedgersForSalesPayment(payment);

    return payment;
  }

  // Crate transaction methods
  async getCrateTransactions(): Promise<CrateTransactionWithRetailer[]> {
    const transactions = Array.from(this.crateTransactions.values());
    return transactions.map(transaction => {
      const retailer = this.retailers.get(transaction.retailerId)!;
      return {
        ...transaction,
        retailer,
      };
    }).sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getCrateTransactionsByRetailer(retailerId: string): Promise<CrateTransaction[]> {
    return Array.from(this.crateTransactions.values()).filter(t => t.retailerId === retailerId);
  }

  async createCrateTransaction(insertTransaction: InsertCrateTransaction): Promise<CrateTransaction> {
    const transaction: CrateTransaction = {
      id: randomUUID(),
      ...insertTransaction,
      createdAt: new Date(),
    };

    this.crateTransactions.set(transaction.id, transaction);

    // Update retailer crate balance
    const retailer = this.retailers.get(transaction.retailerId);
    if (retailer) {
      if (transaction.transactionType === "Given") {
        retailer.crateBalance += transaction.quantity;
      } else if (transaction.transactionType === "Returned") {
        retailer.crateBalance -= transaction.quantity;
      }
      this.retailers.set(retailer.id, retailer);
    }

    // Update ledgers for crate deposit transactions
    if (parseFloat(transaction.depositAmount) > 0) {
      await this.updateLedgersForCrateTransaction(transaction);
    }

    return transaction;
  }

  // Expense category methods
  async getExpenseCategories(): Promise<ExpenseCategory[]> {
    return Array.from(this.expenseCategories.values()).filter(c => c.isActive);
  }

  async getExpenseCategory(id: string): Promise<ExpenseCategory | undefined> {
    return this.expenseCategories.get(id);
  }

  async createExpenseCategory(insertCategory: InsertExpenseCategory): Promise<ExpenseCategory> {
    const category: ExpenseCategory = {
      id: randomUUID(),
      ...insertCategory,
      isActive: true,
      createdAt: new Date(),
    };
    this.expenseCategories.set(category.id, category);
    return category;
  }

  async updateExpenseCategory(id: string, updateData: Partial<InsertExpenseCategory>): Promise<ExpenseCategory | undefined> {
    const category = this.expenseCategories.get(id);
    if (!category) return undefined;

    const updated = { ...category, ...updateData };
    this.expenseCategories.set(id, updated);
    return updated;
  }

  async deleteExpenseCategory(id: string): Promise<boolean> {
    const category = this.expenseCategories.get(id);
    if (!category) return false;

    category.isActive = false;
    this.expenseCategories.set(id, category);
    return true;
  }

  // Expense methods
  async getExpenses(): Promise<ExpenseWithCategory[]> {
    const expenses = Array.from(this.expenses.values());
    return expenses.map(expense => {
      const category = this.expenseCategories.get(expense.categoryId)!;
      const bankAccount = expense.bankAccountId ? this.bankAccounts.get(expense.bankAccountId) : undefined;
      return {
        ...expense,
        category,
        bankAccount,
      };
    }).sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getExpense(id: string): Promise<ExpenseWithCategory | undefined> {
    const expense = this.expenses.get(id);
    if (!expense) return undefined;

    const category = this.expenseCategories.get(expense.categoryId)!;
    const bankAccount = expense.bankAccountId ? this.bankAccounts.get(expense.bankAccountId) : undefined;
    
    return {
      ...expense,
      category,
      bankAccount,
    };
  }

  async createExpense(insertExpense: InsertExpense): Promise<ExpenseWithCategory> {
    const expense: Expense = {
      id: randomUUID(),
      ...insertExpense,
      createdAt: new Date(),
    };

    this.expenses.set(expense.id, expense);

    // Update ledgers based on payment mode
    await this.updateLedgersForExpense(expense);

    const category = this.expenseCategories.get(expense.categoryId)!;
    const bankAccount = expense.bankAccountId ? this.bankAccounts.get(expense.bankAccountId) : undefined;

    return {
      ...expense,
      category,
      bankAccount,
    };
  }

  // Enhanced ledger methods
  async getRetailerLedger(retailerId: string): Promise<any[]> {
    const invoices = Array.from(this.salesInvoices.values()).filter(i => i.retailerId === retailerId);
    const payments = Array.from(this.salesPayments.values()).filter(p => p.retailerId === retailerId);
    const crateTransactions = Array.from(this.crateTransactions.values()).filter(t => t.retailerId === retailerId);

    const ledgerEntries = [
      ...invoices.map(invoice => ({
        date: invoice.invoiceDate,
        description: `Sales Invoice ${invoice.invoiceNumber}`,
        debit: "0.00",
        credit: invoice.totalAmount,
        type: "sales_invoice",
        reference: invoice.id,
      })),
      ...payments.map(payment => ({
        date: payment.paymentDate,
        description: `Payment - ${payment.paymentMode}`,
        debit: payment.amount,
        credit: "0.00",
        type: "sales_payment",
        reference: payment.id,
      })),
      ...crateTransactions
        .filter(transaction => parseFloat(transaction.depositAmount) > 0)
        .map(transaction => ({
          date: transaction.transactionDate,
          description: `Crate ${transaction.transactionType} - ${transaction.quantity} crates (Deposit: ₹${parseFloat(transaction.depositAmount).toLocaleString('en-IN')})`,
          debit: transaction.transactionType === "Returned" ? transaction.depositAmount : "0.00",
          credit: transaction.transactionType === "Given" ? transaction.depositAmount : "0.00",
          type: "crate_deposit",
          reference: transaction.id,
        }))
    ];

    return ledgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async getUdhaaarBook(): Promise<any[]> {
    const retailers = Array.from(this.retailers.values());
    return retailers
      .filter(retailer => parseFloat(retailer.udhaaarBalance) > 0)
      .map(retailer => ({
        retailer,
        udhaaarBalance: retailer.udhaaarBalance,
      }));
  }

  async getCrateLedger(retailerId?: string): Promise<any[]> {
    let transactions = Array.from(this.crateTransactions.values());
    
    if (retailerId) {
      transactions = transactions.filter(t => t.retailerId === retailerId);
    }

    return transactions.map(transaction => {
      const retailer = this.retailers.get(transaction.retailerId)!;
      return {
        ...transaction,
        retailer,
      };
    }).sort((a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime());
  }

  // Helper method to update ledgers for sales payments
  private async updateLedgersForSalesPayment(payment: SalesPayment): Promise<void> {
    if (payment.paymentMode === "Cash") {
      const cashEntry: CashbookEntry = {
        id: randomUUID(),
        date: payment.paymentDate,
        description: `Sales Payment from ${payment.retailerId}`,
        debit: payment.amount,
        credit: "0.00",
        balance: "0.00", // Will be calculated based on previous entries
        referenceType: "SalesPayment",
        referenceId: payment.id,
        createdAt: new Date(),
      };

      // Calculate balance (simplified)
      const previousEntries = Array.from(this.cashbook.values())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const lastBalance = previousEntries.length > 0 
        ? parseFloat(previousEntries[previousEntries.length - 1].balance)
        : 0;
      cashEntry.balance = (lastBalance + parseFloat(payment.amount.toString())).toFixed(2);

      this.cashbook.set(cashEntry.id, cashEntry);
    } else if (payment.bankAccountId) {
      const bankEntry: BankbookEntry = {
        id: randomUUID(),
        bankAccountId: payment.bankAccountId,
        date: payment.paymentDate,
        description: `Sales Payment from ${payment.retailerId}`,
        debit: payment.amount,
        credit: "0.00",
        balance: "0.00",
        referenceType: "SalesPayment",
        referenceId: payment.id,
        createdAt: new Date(),
      };

      // Update bank account balance
      const bankAccount = this.bankAccounts.get(payment.bankAccountId);
      if (bankAccount) {
        bankAccount.balance = (parseFloat(bankAccount.balance) + parseFloat(payment.amount.toString())).toFixed(2);
        this.bankAccounts.set(bankAccount.id, bankAccount);
        bankEntry.balance = bankAccount.balance;
      }

      this.bankbook.set(bankEntry.id, bankEntry);
    }
  }

  // Helper method to update ledgers for crate transactions with deposits
  private async updateLedgersForCrateTransaction(transaction: CrateTransaction): Promise<void> {
    const retailer = this.retailers.get(transaction.retailerId);
    if (!retailer) return;

    const description = `Crate ${transaction.transactionType} - ${transaction.quantity} crates (${retailer.name})`;
    
    // For crate deposits, we'll record them as cash transactions for simplicity
    // "Given" = retailer pays deposit (cash inflow for business)
    // "Returned" = retailer gets deposit back (cash outflow for business)
    const cashEntry: CashbookEntry = {
      id: randomUUID(),
      date: transaction.transactionDate,
      description,
      inflow: transaction.transactionType === "Given" ? transaction.depositAmount : "0.00",
      outflow: transaction.transactionType === "Returned" ? transaction.depositAmount : "0.00",
      balance: "0.00", // Will be calculated based on previous entries
      referenceType: "CrateTransaction",
      referenceId: transaction.id,
      createdAt: new Date(),
    };

    // Calculate balance (simplified)
    const previousEntries = Array.from(this.cashbook.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const lastBalance = previousEntries.length > 0 
      ? parseFloat(previousEntries[previousEntries.length - 1].balance)
      : 0;
    
    const inflowAmount = parseFloat(cashEntry.inflow);
    const outflowAmount = parseFloat(cashEntry.outflow);
    cashEntry.balance = (lastBalance + inflowAmount - outflowAmount).toFixed(2);

    this.cashbook.set(cashEntry.id, cashEntry);
  }

  // Helper method to update ledgers for expenses
  private async updateLedgersForExpense(expense: Expense): Promise<void> {
    if (expense.paymentMode === "Cash") {
      const cashEntry: CashbookEntry = {
        id: randomUUID(),
        date: expense.paymentDate,
        description: expense.description,
        debit: "0.00",
        credit: expense.amount,
        balance: "0.00",
        referenceType: "Expense",
        referenceId: expense.id,
        createdAt: new Date(),
      };

      // Calculate balance (simplified)
      const previousEntries = Array.from(this.cashbook.values())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const lastBalance = previousEntries.length > 0 
        ? parseFloat(previousEntries[previousEntries.length - 1].balance)
        : 0;
      cashEntry.balance = (lastBalance - parseFloat(expense.amount.toString())).toFixed(2);

      this.cashbook.set(cashEntry.id, cashEntry);
    } else if (expense.bankAccountId) {
      const bankEntry: BankbookEntry = {
        id: randomUUID(),
        bankAccountId: expense.bankAccountId,
        date: expense.paymentDate,
        description: expense.description,
        debit: "0.00",
        credit: expense.amount,
        balance: "0.00",
        referenceType: "Expense",
        referenceId: expense.id,
        createdAt: new Date(),
      };

      // Update bank account balance
      const bankAccount = this.bankAccounts.get(expense.bankAccountId);
      if (bankAccount) {
        bankAccount.balance = (parseFloat(bankAccount.balance) - parseFloat(expense.amount.toString())).toFixed(2);
        this.bankAccounts.set(bankAccount.id, bankAccount);
        bankEntry.balance = bankAccount.balance;
      }

      this.bankbook.set(bankEntry.id, bankEntry);
    }
  }
}

export const storage = new MemStorage();
