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

export const commodities = pgTable("commodities", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  quality: text("quality").notNull(),
  unit: text("unit").notNull(), // Crates, Kgs
  vendorId: uuid("vendor_id").references(() => vendors.id),
  baseRate: decimal("base_rate", { precision: 8, scale: 2 }).notNull(),
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
  grossAmount: decimal("gross_amount", { precision: 10, scale: 2 }).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull(),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(),
  freightCharges: decimal("freight_charges", { precision: 8, scale: 2 }).default("0.00"),
  laborCharges: decimal("labor_charges", { precision: 8, scale: 2 }).default("0.00"),
  netPayable: decimal("net_payable", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default("0.00"),
  balanceAmount: decimal("balance_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull(), // Paid, Partially Paid, Unpaid
  createdAt: timestamp("created_at").defaultNow(),
});

export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: uuid("invoice_id").references(() => purchaseInvoices.id).notNull(),
  commodityId: uuid("commodity_id").references(() => commodities.id).notNull(),
  quantity: decimal("quantity", { precision: 8, scale: 2 }).notNull(),
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
  commodityId: uuid("commodity_id").references(() => commodities.id).notNull(),
  quantityInCrates: decimal("quantity_in_crates", { precision: 8, scale: 2 }).default("0.00"),
  quantityInKgs: decimal("quantity_in_kgs", { precision: 8, scale: 2 }).default("0.00"),
  lastUpdated: timestamp("last_updated").defaultNow(),
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

export const insertCommoditySchema = createInsertSchema(commodities).omit({
  id: true,
  createdAt: true,
});

export const insertBankAccountSchema = createInsertSchema(bankAccounts).omit({
  id: true,
  balance: true,
  createdAt: true,
});

export const insertPurchaseInvoiceSchema = createInsertSchema(purchaseInvoices).omit({
  id: true,
  invoiceNumber: true,
  paidAmount: true,
  balanceAmount: true,
  status: true,
  createdAt: true,
}).extend({
  invoiceDate: z.union([z.string(), z.date()]).transform((val) => {
    return typeof val === 'string' ? new Date(val) : val;
  }),
});

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export const insertStockSchema = createInsertSchema(stock).omit({
  id: true,
  lastUpdated: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;

export type Commodity = typeof commodities.$inferSelect;
export type InsertCommodity = z.infer<typeof insertCommoditySchema>;

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

export type StockWithCommodity = Stock & {
  commodity: Commodity & {
    vendor: Vendor;
  };
};
