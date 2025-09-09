import { db } from "./db";
import bcrypt from "bcrypt";
import { users, vendors, items, bankAccounts, expenseCategories, retailers } from "@shared/schema";
import { ROLE_PERMISSIONS } from "@shared/permissions";
import { randomUUID } from "crypto";

export async function initializeDatabase() {
  try {
    // Check if users exist
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) {
      console.log("Database already initialized");
      return;
    }

    console.log("Initializing database with default data...");

    // Create default admin user
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await db.insert(users).values({
      username: "admin",
      password: hashedPassword,
      role: "Admin",
      name: "System Administrator",
      permissions: [...ROLE_PERMISSIONS.Admin],
    });

    // Create additional users for testing
    const operatorPassword = await bcrypt.hash("operator123", 10);
    await db.insert(users).values({
      username: "operator",
      password: operatorPassword,
      role: "Operator",
      name: "Suresh Patil",
      permissions: [...ROLE_PERMISSIONS.Operator],
    });

    const accountantPassword = await bcrypt.hash("accountant123", 10);
    await db.insert(users).values({
      username: "accountant",
      password: accountantPassword,
      role: "Accountant",
      name: "Priya Sharma",
      permissions: [...ROLE_PERMISSIONS.Accountant],
    });

    // Create multiple vendors
    const vendor1Id = randomUUID();
    await db.insert(vendors).values({
      id: vendor1Id,
      name: "Ramesh Fruit Supplier",
      contactPerson: "Ramesh Kumar",
      phone: "9876543210",
      address: "Market Road, Mumbai",
      gstNumber: "27ABCDE1234F1Z5",
      panNumber: "ABCDE1234F",
      balance: "15000.00",
      isActive: true,
    });

    const vendor2Id = randomUUID();
    await db.insert(vendors).values({
      id: vendor2Id,
      name: "Krishna Produce Co.",
      contactPerson: "Krishna Rao",
      phone: "9876543220",
      address: "Wholesale Market, Pune",
      gstNumber: "27ABCDE1234H1Z7",
      panNumber: "ABCDE1234H",
      balance: "8500.00",
      isActive: true,
    });

    const vendor3Id = randomUUID();
    await db.insert(vendors).values({
      id: vendor3Id,
      name: "Mahalakshmi Fruits",
      contactPerson: "Lakshmi Devi",
      phone: "9876543230",
      address: "Fruit Market, Nashik",
      gstNumber: "27ABCDE1234I1Z8",
      panNumber: "ABCDE1234I",
      balance: "22000.00",
      isActive: true,
    });

    // Create multiple items for different vendors
    await db.insert(items).values([
      {
        name: "Mangoes",
        quality: "A-Grade",
        unit: "crate",
        vendorId: vendor1Id,
        isActive: true,
      },
      {
        name: "Mangoes",
        quality: "B-Grade", 
        unit: "crate",
        vendorId: vendor1Id,
        isActive: true,
      },
      {
        name: "Apples",
        quality: "Premium",
        unit: "box",
        vendorId: vendor2Id,
        isActive: true,
      },
      {
        name: "Oranges",
        quality: "A-Grade",
        unit: "kgs",
        vendorId: vendor2Id,
        isActive: true,
      },
      {
        name: "Grapes",
        quality: "Export Quality",
        unit: "box",
        vendorId: vendor3Id,
        isActive: true,
      },
      {
        name: "Pomegranates",
        quality: "A-Grade",
        unit: "crate",
        vendorId: vendor3Id,
        isActive: true,
      }
    ]);

    // Create multiple bank accounts
    await db.insert(bankAccounts).values([
      {
        name: "Business Current Account",
        accountNumber: "1234567890",
        bankName: "State Bank of India",
        ifscCode: "SBIN0001234",
        balance: "125000.00",
        isActive: true,
      },
      {
        name: "Savings Account",
        accountNumber: "9876543210",
        bankName: "HDFC Bank",
        ifscCode: "HDFC0001234",
        balance: "85000.00",
        isActive: true,
      }
    ]);

    // Create multiple retailers
    await db.insert(retailers).values([
      {
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
      },
      {
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
      },
      {
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
      },
      {
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
      }
    ]);

    // Create sample expense categories
    await db.insert(expenseCategories).values([
      { name: "Transport", description: "Transportation and logistics costs" },
      { name: "Labor", description: "Labor and workforce expenses" },
      { name: "Market Fee", description: "Market and commission fees" },
      { name: "Utilities", description: "Electricity, water, and utilities" },
      { name: "Office Expenses", description: "Stationary, office supplies" },
      { name: "Rent", description: "Shop and storage rent" },
      { name: "Maintenance", description: "Equipment and facility maintenance" },
    ]);

    console.log("Database initialized successfully!");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}