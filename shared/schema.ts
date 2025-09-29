import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, uuid, boolean, jsonb, unique, index, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// IMPORTANT: All insert schemas now require tenantId to be provided by callers.
// The tenantId should be injected from auth context in server-side operations.
// Audit all usages of insert schemas to ensure tenantId is provided.

// MIGRATION PLAN: Adding NOT NULL tenantId requires careful migration:
// 1. Add nullable tenant_id columns to all affected tables
// 2. Backfill tenant_id values for existing data
// 3. Set columns to NOT NULL
// 4. Add composite unique constraints and drop former unique constraints
// Test on a database snapshot to minimize downtime/locking

// Crate Transaction Type Constants
export const CRATE_TRANSACTION_TYPES = {
  GIVEN: 'Issue',
  RETURNED: 'Return'
} as const;

export type CrateTransactionType = typeof CRATE_TRANSACTION_TYPES[keyof typeof CRATE_TRANSACTION_TYPES];

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  role: text("role").notNull(), // Admin, Operator, Accountant
  name: text("name").notNull(),
  permissions: text("permissions").array().default([]).notNull(), // Individual user permissions
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueUsernamePerTenant: unique().on(table.tenantId, table.username),
}));

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  isActive: boolean("is_active").default(true),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vendors = pgTable("vendors", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  address: text("address"),
  gstNumber: text("gst_number"),
  panNumber: text("pan_number"),
  balance: decimal("balance", { precision: 10, scale: 2 }).default("0.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueNamePerTenant: unique().on(table.tenantId, table.name),
  // Comment 1: Composite unique key for tenant-scoped referential integrity
  uqVendorsTenantId: unique('uq_vendors_tenant_id').on(table.tenantId, table.id),
}));

export const items = pgTable("items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: text("name").notNull(),
  quality: text("quality").notNull(),
  unit: text("unit").notNull(), // box, crate, kgs
  vendorId: uuid("vendor_id").references(() => vendors.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  itemsTenantIdx: index('idx_items_tenant').on(table.tenantId),
  // Comment 5: Optional item identity uniqueness per tenant - composite unique constraint
  itemsUnique: unique('items_tenant_identity_unique').on(table.tenantId, table.name, table.quality, table.unit),
  // Comment 1: Composite unique key for tenant-scoped referential integrity
  uqItemsTenantId: unique('uq_items_tenant_id').on(table.tenantId, table.id),
  // Comment 1: Composite foreign key for tenant-scoped referential integrity (vendorId can be null)
  fkItemsVendor: foreignKey({
    name: 'fk_items_vendor_tenant',
    columns: [table.tenantId, table.vendorId],
    foreignColumns: [vendors.tenantId, vendors.id]
  }),
}));

export const bankAccounts = pgTable("bank_accounts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: text("name").notNull(),
  accountNumber: text("account_number").notNull(),
  bankName: text("bank_name").notNull(),
  ifscCode: text("ifsc_code"),
  balance: decimal("balance", { precision: 12, scale: 2 }).default("0.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueAccountNumberPerTenant: unique().on(table.tenantId, table.accountNumber),
  // Comment 1: Composite unique key for tenant-scoped referential integrity
  uqBankAccountsTenantId: unique('uq_bank_accounts_tenant_id').on(table.tenantId, table.id),
}));

export const purchaseInvoices = pgTable("purchase_invoices", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  invoiceNumber: text("invoice_number").notNull(),
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
}, (table) => ({
  uniqueInvoiceNumberPerTenant: unique().on(table.tenantId, table.invoiceNumber),
  // Comment 1: Composite unique key for tenant-scoped referential integrity
  uqPurchaseInvoicesTenantId: unique('uq_purchase_invoices_tenant_id').on(table.tenantId, table.id),
}));

export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  invoiceId: uuid("invoice_id").references(() => purchaseInvoices.id).notNull(),
  itemId: uuid("item_id").references(() => items.id).notNull(),
  weight: decimal("weight", { precision: 8, scale: 2 }).notNull(),
  crates: decimal("crates", { precision: 8, scale: 2 }).notNull(),
  boxes: decimal("boxes", { precision: 8, scale: 2 }).default("0.00"),
  rate: decimal("rate", { precision: 8, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  // TENANT CONSISTENCY INVARIANT: tenantId must match purchaseInvoices.tenantId and items.tenantId
}, (table) => ({
  invoiceItemsTenantIdx: index('idx_invoice_items_tenant').on(table.tenantId),
  // Comment 1: Composite foreign keys for tenant-scoped referential integrity
  fkInvoiceItemsInvoice: foreignKey({
    name: 'fk_invoice_items_invoice_tenant',
    columns: [table.tenantId, table.invoiceId],
    foreignColumns: [purchaseInvoices.tenantId, purchaseInvoices.id]
  }),
  fkInvoiceItemsItem: foreignKey({
    name: 'fk_invoice_items_item_tenant',
    columns: [table.tenantId, table.itemId],
    foreignColumns: [items.tenantId, items.id]
  }),
}));

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
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
  // TENANT CONSISTENCY INVARIANT: tenantId must match purchaseInvoices.tenantId, vendors.tenantId, and bankAccounts.tenantId (if not null)
}, (table) => ({
  paymentsTenantIdx: index('idx_payments_tenant').on(table.tenantId),
  // Comment 1: Composite foreign keys for tenant-scoped referential integrity
  fkPaymentsInvoice: foreignKey({
    name: 'fk_payments_invoice_tenant',
    columns: [table.tenantId, table.invoiceId],
    foreignColumns: [purchaseInvoices.tenantId, purchaseInvoices.id]
  }),
  fkPaymentsVendor: foreignKey({
    name: 'fk_payments_vendor_tenant',
    columns: [table.tenantId, table.vendorId],
    foreignColumns: [vendors.tenantId, vendors.id]
  }),
  // Comment 1: Additional composite FK for bankAccountId (nullable)
  fkPaymentsBankAccount: foreignKey({
    name: 'fk_payments_bank_account_tenant',
    columns: [table.tenantId, table.bankAccountId],
    foreignColumns: [bankAccounts.tenantId, bankAccounts.id]
  }),
}));

export const stock = pgTable("stock", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  itemId: uuid("item_id").references(() => items.id).notNull(),
  quantityInCrates: decimal("quantity_in_crates", { precision: 8, scale: 2 }).default("0.00"),
  quantityInBoxes: decimal("quantity_in_boxes", { precision: 8, scale: 2 }).default("0.00"),
  quantityInKgs: decimal("quantity_in_kgs", { precision: 8, scale: 2 }).default("0.00"),
  lastUpdated: timestamp("last_updated").defaultNow(),
}, (table) => ({
  stockTenantIdx: index('idx_stock_tenant').on(table.tenantId),
}));

export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  itemId: uuid("item_id").references(() => items.id).notNull(),
  movementType: text("movement_type").notNull(), // "IN" or "OUT"
  quantityInCrates: decimal("quantity_in_crates", { precision: 8, scale: 2 }).notNull(),
  quantityInBoxes: decimal("quantity_in_boxes", { precision: 8, scale: 2 }).default("0.00"),
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
  // TENANT CONSISTENCY INVARIANT: tenantId must match items.tenantId, vendors.tenantId (if not null), retailers.tenantId (if not null), and purchaseInvoices.tenantId (if not null)
}, (table) => ({
  stockMovementsTenantIdx: index('idx_stock_movements_tenant').on(table.tenantId),
  // Comment 1: Composite foreign keys for tenant-scoped referential integrity
  fkStockMovementsItem: foreignKey({
    name: 'fk_stock_movements_item_tenant',
    columns: [table.tenantId, table.itemId],
    foreignColumns: [items.tenantId, items.id]
  }),
  // Comment 1: Additional composite FKs for nullable relations
  fkStockMovementsVendor: foreignKey({
    name: 'fk_stock_movements_vendor_tenant',
    columns: [table.tenantId, table.vendorId],
    foreignColumns: [vendors.tenantId, vendors.id]
  }),
  fkStockMovementsRetailer: foreignKey({
    name: 'fk_stock_movements_retailer_tenant',
    columns: [table.tenantId, table.retailerId],
    foreignColumns: [retailers.tenantId, retailers.id]
  }),
  fkStockMovementsPurchaseInvoice: foreignKey({
    name: 'fk_stock_movements_purchase_invoice_tenant',
    columns: [table.tenantId, table.purchaseInvoiceId],
    foreignColumns: [purchaseInvoices.tenantId, purchaseInvoices.id]
  }),
}));

export const cashbook = pgTable("cashbook", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  date: timestamp("date").notNull(),
  description: text("description").notNull(),
  inflow: decimal("inflow", { precision: 10, scale: 2 }).default("0.00"),
  outflow: decimal("outflow", { precision: 10, scale: 2 }).default("0.00"),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull(),
  referenceType: text("reference_type"), // Payment, Other
  referenceId: uuid("reference_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  cashbookTenantIdx: index('idx_cashbook_tenant').on(table.tenantId),
}));

export const bankbook = pgTable("bankbook", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id).notNull(),
  date: timestamp("date").notNull(),
  description: text("description").notNull(),
  debit: decimal("debit", { precision: 10, scale: 2 }).default("0.00"),
  credit: decimal("credit", { precision: 10, scale: 2 }).default("0.00"),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull(),
  referenceType: text("reference_type"), // Payment, Other
  referenceId: uuid("reference_id"),
  createdAt: timestamp("created_at").defaultNow(),
  // TENANT CONSISTENCY INVARIANT: tenantId must match bankAccounts.tenantId
}, (table) => ({
  bankbookTenantIdx: index('idx_bankbook_tenant').on(table.tenantId),
  // Comment 1: Composite foreign keys for tenant-scoped referential integrity
  fkBankbookBankAccount: foreignKey({
    name: 'fk_bankbook_bank_account_tenant',
    columns: [table.tenantId, table.bankAccountId],
    foreignColumns: [bankAccounts.tenantId, bankAccounts.id]
  }),
}));

export const retailers = pgTable("retailers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
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
}, (table) => ({
  uniqueNamePerTenant: unique().on(table.tenantId, table.name),
  // Comment 1: Composite unique key for tenant-scoped referential integrity
  uqRetailersTenantId: unique('uq_retailers_tenant_id').on(table.tenantId, table.id),
}));

export const salesInvoices = pgTable("sales_invoices", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  invoiceNumber: text("invoice_number").notNull(),
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
}, (table) => ({
  uniqueInvoiceNumberPerTenant: unique().on(table.tenantId, table.invoiceNumber),
  // Comment 1: Composite unique key for tenant-scoped referential integrity
  uqSalesInvoicesTenantId: unique('uq_sales_invoices_tenant_id').on(table.tenantId, table.id),
}));

export const salesInvoiceItems = pgTable("sales_invoice_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  invoiceId: uuid("invoice_id").references(() => salesInvoices.id).notNull(),
  itemId: uuid("item_id").references(() => items.id).notNull(),
  weight: decimal("weight", { precision: 8, scale: 2 }).notNull(),
  crates: decimal("crates", { precision: 8, scale: 2 }).notNull(),
  boxes: decimal("boxes", { precision: 8, scale: 2 }).default("0.00"),
  rate: decimal("rate", { precision: 8, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  // TENANT CONSISTENCY INVARIANT: tenantId must match salesInvoices.tenantId and items.tenantId
}, (table) => ({
  salesInvoiceItemsTenantIdx: index('idx_sales_invoice_items_tenant').on(table.tenantId),
  // Comment 1: Composite foreign keys for tenant-scoped referential integrity
  fkSalesInvoiceItemsInvoice: foreignKey({
    name: 'fk_sales_invoice_items_invoice_tenant',
    columns: [table.tenantId, table.invoiceId],
    foreignColumns: [salesInvoices.tenantId, salesInvoices.id]
  }),
  fkSalesInvoiceItemsItem: foreignKey({
    name: 'fk_sales_invoice_items_item_tenant',
    columns: [table.tenantId, table.itemId],
    foreignColumns: [items.tenantId, items.id]
  }),
}));

export const salesPayments = pgTable("sales_payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
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
  // TENANT CONSISTENCY INVARIANT: tenantId must match salesInvoices.tenantId, retailers.tenantId, and bankAccounts.tenantId (if not null)
}, (table) => ({
  salesPaymentsTenantIdx: index('idx_sales_payments_tenant').on(table.tenantId),
  // Comment 1: Composite foreign keys for tenant-scoped referential integrity
  fkSalesPaymentsInvoice: foreignKey({
    name: 'fk_sales_payments_invoice_tenant',
    columns: [table.tenantId, table.invoiceId],
    foreignColumns: [salesInvoices.tenantId, salesInvoices.id]
  }),
  fkSalesPaymentsRetailer: foreignKey({
    name: 'fk_sales_payments_retailer_tenant',
    columns: [table.tenantId, table.retailerId],
    foreignColumns: [retailers.tenantId, retailers.id]
  }),
  // Comment 1: Additional composite FK for bankAccountId (nullable)
  fkSalesPaymentsBankAccount: foreignKey({
    name: 'fk_sales_payments_bank_account_tenant',
    columns: [table.tenantId, table.bankAccountId],
    foreignColumns: [bankAccounts.tenantId, bankAccounts.id]
  }),
}));

export const crateTransactions = pgTable("crate_transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  retailerId: uuid("retailer_id").references(() => retailers.id).notNull(),
  transactionType: text("transaction_type").notNull(), // Issue, Return
  quantity: integer("quantity").notNull(), // Number of crates
  depositAmount: decimal("deposit_amount", { precision: 8, scale: 2 }).default("0.00"),
  transactionDate: timestamp("transaction_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  // TENANT CONSISTENCY INVARIANT: tenantId must match retailers.tenantId
}, (table) => ({
  crateTransactionsTenantIdx: index('idx_crate_transactions_tenant').on(table.tenantId),
  // Comment 1: Composite foreign keys for tenant-scoped referential integrity
  fkCrateTransactionsRetailer: foreignKey({
    name: 'fk_crate_transactions_retailer_tenant',
    columns: [table.tenantId, table.retailerId],
    foreignColumns: [retailers.tenantId, retailers.id]
  }),
}));

export const expenseCategories = pgTable("expense_categories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueNamePerTenant: unique().on(table.tenantId, table.name),
  // Comment 1: Composite unique key for tenant-scoped referential integrity
  uqExpenseCategoriesTenantId: unique('uq_expense_categories_tenant_id').on(table.tenantId, table.id),
}));

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
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
  // TENANT CONSISTENCY INVARIANT: tenantId must match expenseCategories.tenantId and bankAccounts.tenantId (if not null)
}, (table) => ({
  expensesTenantIdx: index('idx_expenses_tenant').on(table.tenantId),
  // Comment 1: Composite foreign keys for tenant-scoped referential integrity
  fkExpensesCategory: foreignKey({
    name: 'fk_expenses_category_tenant',
    columns: [table.tenantId, table.categoryId],
    foreignColumns: [expenseCategories.tenantId, expenseCategories.id]
  }),
  // Comment 1: Additional composite FK for bankAccountId (nullable)
  fkExpensesBankAccount: foreignKey({
    name: 'fk_expenses_bank_account_tenant',
    columns: [table.tenantId, table.bankAccountId],
    foreignColumns: [bankAccounts.tenantId, bankAccounts.id]
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
});

// Tenant Settings Schema - defines the expected structure for tenant settings
export const tenantSettingsSchema = z.object({
  // Company Information
  companyName: z.string().min(1).max(255).optional(),
  address: z.string().max(1000).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  gstNumber: z.string().max(50).optional(),
  
  // Business Settings
  commissionRate: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(), // Decimal string validation
  currency: z.enum(["INR", "USD", "EUR"]).optional(),
  dateFormat: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]).optional(),
  
  // Notification Settings
  notifications: z.boolean().optional(),
  emailAlerts: z.boolean().optional(),
  smsAlerts: z.boolean().optional(),
  
  // Data & Backup Settings
  autoBackup: z.boolean().optional(),
  backupFrequency: z.enum(["hourly", "daily", "weekly", "monthly"]).optional(),
}).strict(); // strict() ensures no extra properties are allowed

export type TenantSettings = z.infer<typeof tenantSettingsSchema>;

export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  balance: true,
  createdAt: true,
});

export const insertItemSchema = createInsertSchema(items, {
  unit: z.enum(["box", "crate", "kgs"], {
    required_error: "Unit is required",
    invalid_type_error: "Unit must be box, crate, or kgs"
  })
}).omit({
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
  transactionType: z.enum([CRATE_TRANSACTION_TYPES.GIVEN, CRATE_TRANSACTION_TYPES.RETURNED]),
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

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

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
  category: ExpenseCategory | null;
  bankAccount: BankAccount | null;
};

export type CrateTransactionWithRetailer = CrateTransaction & {
  retailer: Retailer;
};

// Pagination types
export type SortOrder = 'asc' | 'desc';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMetadata;
}

// Ledger Types
export interface VendorLedgerEntry {
  tenantId: string;
  date: Date;
  description: string;
  referenceType: 'Invoice' | 'Payment';
  referenceId: string;
  debit: number;
  credit: number;
  balance: number;
  invoiceNumber?: string;
  status?: string;
  paymentMode?: string;
  notes?: string | null;
  createdAt?: Date | null;
}

export interface RetailerLedgerEntry {
  tenantId: string;
  date: Date;
  description: string;
  referenceType: 'Sales Invoice' | 'Sales Payment' | 'Crate Transaction';
  referenceId: string;
  debit: number;
  credit: number;
  balance: number;
  crateBalance?: number;
  invoiceNumber?: string;
  status?: string;
  paymentMode?: string;
  transactionType?: string;
  quantity?: number;
  notes?: string | null;
  createdAt?: Date | null;
}

export interface UdhaaarBookEntry {
  tenantId: string;
  retailerId: string;
  retailerName: string;
  contactPerson: string | null;
  phone: string | null;
  address: string | null;
  udhaaarBalance: number;
  totalBalance: number;
  shortfallBalance: number;
  crateBalance: number;
  isActive: boolean | null;
  createdAt: Date | null;
}

export interface CrateLedgerEntry {
  id: string;
  tenantId: string;
  retailerId: string;
  retailerName: string | null;
  contactPerson: string | null;
  phone: string | null;
  transactionType: string;
  quantity: number;
  depositAmount: number;
  transactionDate: Date;
  notes: string | null;
  runningBalance: number;
  createdAt: Date | null;
}

// Authentication Schemas
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

export const refreshTokenSchema = z.object({
  // No body needed for refresh - refresh token comes from HttpOnly cookie
});

// Authentication Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    tenantId: string;
    username: string;
    name: string;
    role: string;
    permissions: string[];
  };
}

export interface RefreshTokenRequest {
  // Token from Authorization header
}

export interface RefreshTokenResponse {
  token: string;
  user: {
    id: string;
    tenantId: string;
    username: string;
    name: string;
    role: string;
    permissions: string[];
  };
}
