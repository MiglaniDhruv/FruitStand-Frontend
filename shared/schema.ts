import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, uuid, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // Admin, Operator, Accountant
  name: text("name").notNull(),
  permissions: text("permissions").array().default([]).notNull(), // Individual user permissions
  createdAt: timestamp("created_at").defaultNow(),
});

export const vendors = pgTable("vendors", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  address: text("address"),
  gstNumber: text("gst_number"),
  panNumber: text("pan_number"),
  balance: decimal("balance", { precision: 10, scale: 2 }).default("0.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const items = pgTable("items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  quality: text("quality").notNull(),
  vendorId: uuid("vendor_id").references(() => vendors.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bankAccounts = pgTable("bank_accounts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  accountNumber: text("account_number").notNull(),
  bankName: text("bank_name").notNull(),
  ifscCode: text("ifsc_code"),
  balance: decimal("balance", { precision: 12, scale: 2 }).default("0.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const purchaseInvoices = pgTable("purchase_invoices", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: text("invoice_number").notNull().unique(),
  vendorId: uuid("vendor_id").references(() => vendors.id).notNull(),
  invoiceDate: timestamp("invoice_date").notNull(),
  commission: decimal("commission", { precision: 10, scale: 2 }).default("0.00"),
  labour: decimal("labour", { precision: 8, scale: 2 }).default("0.00"),
  truckFreight: decimal("truck_freight", { precision: 8, scale: 2 }).default("0.00"),
  crateFreight: decimal("crate_freight", { precision: 8, scale: 2 }).default("0.00"),
  postExpenses: decimal("post_expenses", { precision: 8, scale: 2 }).default("0.00"),
  draftExpenses: decimal("draft_expenses", { precision: 8, scale: 2 }).default("0.00"),
  vatav: decimal("vatav", { precision: 8, scale: 2 }).default("0.00"),
  otherExpenses: decimal("other_expenses", { precision: 8, scale: 2 }).default("0.00"),
  advance: decimal("advance", { precision: 10, scale: 2 }).default("0.00"),
  totalExpense: decimal("total_expense", { precision: 10, scale: 2 }).notNull(),
  totalSelling: decimal("total_selling", { precision: 10, scale: 2 }).notNull(),
  totalLessExpenses: decimal("total_less_expenses", { precision: 10, scale: 2 }).notNull(),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default("0.00"),
  balanceAmount: decimal("balance_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull(), // Paid, Partially Paid, Unpaid
  createdAt: timestamp("created_at").defaultNow(),
});

export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: uuid("invoice_id").references(() => purchaseInvoices.id).notNull(),
  itemId: uuid("item_id").references(() => items.id).notNull(),
  weight: decimal("weight", { precision: 8, scale: 2 }).notNull(),
  crates: decimal("crates", { precision: 8, scale: 2 }).notNull(),
  rate: decimal("rate", { precision: 8, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: uuid("invoice_id").references(() => purchaseInvoices.id).notNull(),
  vendorId: uuid("vendor_id").references(() => vendors.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMode: text("payment_mode").notNull(), // Cash, Bank, UPI, Cheque
  paymentDate: timestamp("payment_date").notNull(),
  bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id),
  chequeNumber: text("cheque_number"),
  upiReference: text("upi_reference"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const stock = pgTable("stock", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  itemId: uuid("item_id").references(() => items.id).notNull(),
  quantityInCrates: decimal("quantity_in_crates", { precision: 8, scale: 2 }).default("0.00"),
  quantityInKgs: decimal("quantity_in_kgs", { precision: 8, scale: 2 }).default("0.00"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  itemId: uuid("item_id").references(() => items.id).notNull(),
  movementType: text("movement_type").notNull(), // "IN" or "OUT"
  quantityInCrates: decimal("quantity_in_crates", { precision: 8, scale: 2 }).notNull(),
  quantityInKgs: decimal("quantity_in_kgs", { precision: 8, scale: 2 }).notNull(),
  referenceType: text("reference_type").notNull(), // "PURCHASE_INVOICE", "SALES_INVOICE", "ADJUSTMENT"
  referenceId: uuid("reference_id"), // Links to purchase invoice, sales invoice, etc.
  referenceNumber: text("reference_number"), // Invoice number for display
  vendorId: uuid("vendor_id").references(() => vendors.id), // For purchase entries
  retailerId: uuid("retailer_id").references(() => retailers.id), // For sales entries
  rate: decimal("rate", { precision: 8, scale: 2 }), // Rate per unit for OUT entries (from sales invoice)
  purchaseInvoiceId: uuid("purchase_invoice_id").references(() => purchaseInvoices.id), // Tracks which OUT entries are used for purchase invoices
  notes: text("notes"),
  movementDate: timestamp("movement_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cashbook = pgTable("cashbook", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(),
  description: text("description").notNull(),
  inflow: decimal("inflow", { precision: 10, scale: 2 }).default("0.00"),
  outflow: decimal("outflow", { precision: 10, scale: 2 }).default("0.00"),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull(),
  referenceType: text("reference_type"), // Payment, Other
  referenceId: uuid("reference_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bankbook = pgTable("bankbook", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id).notNull(),
  date: timestamp("date").notNull(),
  description: text("description").notNull(),
  debit: decimal("debit", { precision: 10, scale: 2 }).default("0.00"),
  credit: decimal("credit", { precision: 10, scale: 2 }).default("0.00"),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull(),
  referenceType: text("reference_type"), // Payment, Other
  referenceId: uuid("reference_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const retailers = pgTable("retailers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  address: text("address"),
  gstNumber: text("gst_number"),
  panNumber: text("pan_number"),
  balance: decimal("balance", { precision: 10, scale: 2 }).default("0.00"),
  udhaaarBalance: decimal("udhaar_balance", { precision: 10, scale: 2 }).default("0.00"), // Credit balance
  shortfallBalance: decimal("shortfall_balance", { precision: 10, scale: 2 }).default("0.00"), // Deficit balance
  crateBalance: integer("crate_balance").default(0), // Number of crates with retailer
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const salesInvoices = pgTable("sales_invoices", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: text("invoice_number").notNull().unique(),
  retailerId: uuid("retailer_id").references(() => retailers.id).notNull(),
  invoiceDate: timestamp("invoice_date").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default("0.00"),
  balanceAmount: decimal("balance_amount", { precision: 10, scale: 2 }).notNull(),
  udhaaarAmount: decimal("udhaar_amount", { precision: 10, scale: 2 }).default("0.00"), // Credit amount
  shortfallAmount: decimal("shortfall_amount", { precision: 10, scale: 2 }).default("0.00"), // Deficit amount
  status: text("status").notNull(), // Paid, Partially Paid, Unpaid
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const salesInvoiceItems = pgTable("sales_invoice_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: uuid("invoice_id").references(() => salesInvoices.id).notNull(),
  itemId: uuid("item_id").references(() => items.id).notNull(),
  weight: decimal("weight", { precision: 8, scale: 2 }).notNull(),
  crates: decimal("crates", { precision: 8, scale: 2 }).notNull(),
  rate: decimal("rate", { precision: 8, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const salesPayments = pgTable("sales_payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: uuid("invoice_id").references(() => salesInvoices.id).notNull(),
  retailerId: uuid("retailer_id").references(() => retailers.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMode: text("payment_mode").notNull(), // Cash, Bank, UPI, Cheque, PaymentLink
  paymentDate: timestamp("payment_date").notNull(),
  bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id),
  chequeNumber: text("cheque_number"),
  upiReference: text("upi_reference"),
  paymentLinkId: text("payment_link_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const crateTransactions = pgTable("crate_transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  retailerId: uuid("retailer_id").references(() => retailers.id).notNull(),
  transactionType: text("transaction_type").notNull(), // Issue, Return
  quantity: integer("quantity").notNull(), // Number of crates
  depositAmount: decimal("deposit_amount", { precision: 8, scale: 2 }).default("0.00"),
  transactionDate: timestamp("transaction_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenseCategories = pgTable("expense_categories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: uuid("category_id").references(() => expenseCategories.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMode: text("payment_mode").notNull(), // Cash, Bank, UPI, Cheque
  paymentDate: timestamp("payment_date").notNull(),
  bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id),
  chequeNumber: text("cheque_number"),
  upiReference: text("upi_reference"),
  description: text("description").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  balance: true,
  createdAt: true,
});

export const insertItemSchema = createInsertSchema(items).omit({
  id: true,
  createdAt: true,
});

export const insertBankAccountSchema = createInsertSchema(bankAccounts).omit({
  id: true,
  balance: true,
  createdAt: true,
});

export const insertPurchaseInvoiceSchema = createInsertSchema(purchaseInvoices, {
  invoiceDate: z.union([z.string(), z.date()]).transform((val) => 
    typeof val === 'string' ? new Date(val) : val
  ),
}).omit({
  id: true,
  invoiceNumber: true,
  paidAmount: true,
  balanceAmount: true,
  status: true,
  createdAt: true,
});

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments, {
  paymentDate: z.union([z.string(), z.date()]).transform((val) => 
    typeof val === 'string' ? new Date(val) : val
  ),
}).omit({
  id: true,
  createdAt: true,
});

export const insertStockSchema = createInsertSchema(stock).omit({
  id: true,
  lastUpdated: true,
});

export const insertStockMovementSchema = createInsertSchema(stockMovements, {
  movementDate: z.union([z.string(), z.date()]).transform((val) => 
    typeof val === 'string' ? new Date(val) : val
  ),
}).omit({
  id: true,
  createdAt: true,
});

export const insertRetailerSchema = createInsertSchema(retailers).omit({
  id: true,
  balance: true,
  udhaaarBalance: true,
  shortfallBalance: true,
  crateBalance: true,
  createdAt: true,
});

export const insertSalesInvoiceSchema = createInsertSchema(salesInvoices, {
  invoiceDate: z.union([z.string(), z.date()]).transform((val) => 
    typeof val === 'string' ? new Date(val) : val
  ),
}).omit({
  id: true,
  invoiceNumber: true,
  paidAmount: true,
  balanceAmount: true,
  udhaaarAmount: true,
  shortfallAmount: true,
  status: true,
  createdAt: true,
});

export const insertSalesInvoiceItemSchema = createInsertSchema(salesInvoiceItems).omit({
  id: true,
  invoiceId: true,
  createdAt: true,
});

export const insertSalesPaymentSchema = createInsertSchema(salesPayments, {
  paymentDate: z.union([z.string(), z.date()]).transform((val) => 
    typeof val === 'string' ? new Date(val) : val
  ),
}).omit({
  id: true,
  createdAt: true,
});

export const insertCrateTransactionSchema = createInsertSchema(crateTransactions, {
  transactionDate: z.union([z.string(), z.date()]).transform((val) => 
    typeof val === 'string' ? new Date(val) : val
  ),
}).omit({
  id: true,
  createdAt: true,
});

export const insertExpenseCategorySchema = createInsertSchema(expenseCategories).omit({
  id: true,
  createdAt: true,
});

export const insertExpenseSchema = createInsertSchema(expenses, {
  paymentDate: z.union([z.string(), z.date()]).transform((val) => 
    typeof val === 'string' ? new Date(val) : val
  ),
}).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;

export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;

export type BankAccount = typeof bankAccounts.$inferSelect;
export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;

export type PurchaseInvoice = typeof purchaseInvoices.$inferSelect;
export type InsertPurchaseInvoice = z.infer<typeof insertPurchaseInvoiceSchema>;

export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type Stock = typeof stock.$inferSelect;
export type InsertStock = z.infer<typeof insertStockSchema>;

export type StockMovement = typeof stockMovements.$inferSelect;
export type InsertStockMovement = z.infer<typeof insertStockMovementSchema>;

export type StockMovementWithItem = StockMovement & {
  item: Item & { vendor: Vendor };
};

export type Retailer = typeof retailers.$inferSelect;
export type InsertRetailer = z.infer<typeof insertRetailerSchema>;

export type SalesInvoice = typeof salesInvoices.$inferSelect;
export type InsertSalesInvoice = z.infer<typeof insertSalesInvoiceSchema>;

export type SalesInvoiceItem = typeof salesInvoiceItems.$inferSelect;
export type InsertSalesInvoiceItem = z.infer<typeof insertSalesInvoiceItemSchema>;

export type SalesPayment = typeof salesPayments.$inferSelect;
export type InsertSalesPayment = z.infer<typeof insertSalesPaymentSchema>;

export type CrateTransaction = typeof crateTransactions.$inferSelect;
export type InsertCrateTransaction = z.infer<typeof insertCrateTransactionSchema>;

export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export type InsertExpenseCategory = z.infer<typeof insertExpenseCategorySchema>;

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

export type CashbookEntry = typeof cashbook.$inferSelect;
export type BankbookEntry = typeof bankbook.$inferSelect;

// Additional types for complex operations
export type InvoiceWithItems = PurchaseInvoice & {
  items: InvoiceItem[];
  vendor: Vendor;
};

export type PaymentWithDetails = Payment & {
  invoice: PurchaseInvoice;
  vendor: Vendor;
  bankAccount?: BankAccount;
};

export type StockWithItem = Stock & {
  item: Item & {
    vendor: Vendor;
  };
};

export type SalesInvoiceWithDetails = SalesInvoice & {
  retailer: Retailer;
  items: SalesInvoiceItem[];
  payments: SalesPayment[];
};

export type SalesPaymentWithDetails = SalesPayment & {
  invoice: SalesInvoice;
  retailer: Retailer;
  bankAccount?: BankAccount;
};

export type ExpenseWithCategory = Expense & {
  category: ExpenseCategory;
  bankAccount?: BankAccount;
};

export type CrateTransactionWithRetailer = CrateTransaction & {
  retailer: Retailer;
};
