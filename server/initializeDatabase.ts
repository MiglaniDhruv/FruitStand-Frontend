import { db } from "./db";
import bcrypt from "bcrypt";
import { 
  users, vendors, items, bankAccounts, expenseCategories, retailers,
  purchaseInvoices, invoiceItems, payments, stock, stockMovements,
  salesInvoices, salesInvoiceItems, salesPayments, crateTransactions,
  expenses, cashbook, bankbook
} from "@shared/schema";
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

    // Get the created IDs for reference
    const allVendors = await db.select().from(vendors);
    const allItems = await db.select().from(items);
    const allRetailers = await db.select().from(retailers);
    const allBankAccounts = await db.select().from(bankAccounts);
    const allExpenseCategories = await db.select().from(expenseCategories);

    // Create comprehensive purchase invoices with different statuses
    const [invoice1] = await db.insert(purchaseInvoices).values({
      invoiceNumber: "PI000001",
      vendorId: allVendors[0].id,
      invoiceDate: new Date("2024-01-15"),
      commission: "1250.00",
      labour: "500.00",
      truckFreight: "800.00",
      crateFreight: "200.00",
      postExpenses: "100.00",
      draftExpenses: "50.00",
      vatav: "0.00",
      otherExpenses: "0.00",
      advance: "0.00",
      totalExpense: "2700.00",
      totalSelling: "25000.00",
      totalLessExpenses: "22300.00",
      netAmount: "22300.00",
      status: "Paid",
      paidAmount: "22300.00",
      balanceAmount: "0.00"
    }).returning();

    const [invoice2] = await db.insert(purchaseInvoices).values({
      invoiceNumber: "PI000002",
      vendorId: allVendors[1].id,
      invoiceDate: new Date("2024-01-18"),
      commission: "900.00",
      labour: "300.00",
      truckFreight: "600.00",
      crateFreight: "150.00",
      postExpenses: "80.00",
      draftExpenses: "30.00",
      vatav: "0.00",
      otherExpenses: "0.00",
      advance: "0.00",
      totalExpense: "2060.00",
      totalSelling: "18000.00",
      totalLessExpenses: "15940.00",
      netAmount: "15940.00",
      status: "Partially Paid",
      paidAmount: "10000.00",
      balanceAmount: "5940.00"
    }).returning();

    const [invoice3] = await db.insert(purchaseInvoices).values({
      invoiceNumber: "PI000003",
      vendorId: allVendors[2].id,
      invoiceDate: new Date("2024-01-20"),
      commission: "1600.00",
      labour: "700.00",
      truckFreight: "1000.00",
      crateFreight: "250.00",
      postExpenses: "120.00",
      draftExpenses: "80.00",
      vatav: "0.00",
      otherExpenses: "50.00",
      advance: "0.00",
      totalExpense: "3800.00",
      totalSelling: "32000.00",
      totalLessExpenses: "28200.00",
      netAmount: "28200.00",
      status: "Unpaid",
      paidAmount: "0.00",
      balanceAmount: "28200.00"
    }).returning();

    // Create invoice items for purchase invoices
    await db.insert(invoiceItems).values([
      {
        invoiceId: invoice1.id,
        itemId: allItems[0].id, // Mangoes A-Grade
        weight: "500.0",
        crates: "25",
        boxes: "0",
        rate: "45.00",
        amount: "22500.00"
      },
      {
        invoiceId: invoice1.id,
        itemId: allItems[1].id, // Mangoes B-Grade
        weight: "100.0",
        crates: "5",
        boxes: "0",
        rate: "25.00",
        amount: "2500.00"
      },
      {
        invoiceId: invoice2.id,
        itemId: allItems[2].id, // Apples Premium
        weight: "300.0",
        crates: "0",
        boxes: "30",
        rate: "60.00",
        amount: "18000.00"
      },
      {
        invoiceId: invoice3.id,
        itemId: allItems[4].id, // Grapes Export Quality
        weight: "400.0",
        crates: "0",
        boxes: "40",
        rate: "80.00",
        amount: "32000.00"
      }
    ]);

    // Create payments with different modes
    await db.insert(payments).values([
      {
        vendorId: allVendors[0].id,
        invoiceId: invoice1.id,
        amount: "15000.00",
        paymentMode: "Cash",
        paymentDate: new Date("2024-01-16"),
        notes: "Partial payment in cash"
      },
      {
        vendorId: allVendors[0].id,
        invoiceId: invoice1.id,
        amount: "7450.00",
        paymentMode: "Bank",
        paymentDate: new Date("2024-01-17"),
        bankAccountId: allBankAccounts[0].id,
        notes: "Final payment via bank transfer"
      },
      {
        vendorId: allVendors[1].id,
        invoiceId: invoice2.id,
        amount: "5000.00",
        paymentMode: "UPI",
        paymentDate: new Date("2024-01-19"),
        upiReference: "UPI123456789",
        notes: "UPI payment"
      },
      {
        vendorId: allVendors[1].id,
        invoiceId: invoice2.id,
        amount: "5000.00",
        paymentMode: "Cheque",
        paymentDate: new Date("2024-01-22"),
        bankAccountId: allBankAccounts[1].id,
        chequeNumber: "CHQ001234",
        notes: "Cheque payment"
      }
    ]);

    // Create stock entries for all items
    await db.insert(stock).values([
      {
        itemId: allItems[0].id, // Mangoes A-Grade
        quantityInCrates: "15",
        quantityInBoxes: "0",
        quantityInKgs: "300.0"
      },
      {
        itemId: allItems[1].id, // Mangoes B-Grade
        quantityInCrates: "8",
        quantityInBoxes: "0", 
        quantityInKgs: "160.0"
      },
      {
        itemId: allItems[2].id, // Apples Premium
        quantityInCrates: "0",
        quantityInBoxes: "12",
        quantityInKgs: "120.0"
      },
      {
        itemId: allItems[3].id, // Oranges A-Grade
        quantityInCrates: "0",
        quantityInBoxes: "0",
        quantityInKgs: "85.0"
      },
      {
        itemId: allItems[4].id, // Grapes Export Quality
        quantityInCrates: "0",
        quantityInBoxes: "18",
        quantityInKgs: "180.0"
      },
      {
        itemId: allItems[5].id, // Pomegranates A-Grade
        quantityInCrates: "6",
        quantityInBoxes: "0",
        quantityInKgs: "120.0"
      }
    ]);

    // Create stock movements (in and out)
    await db.insert(stockMovements).values([
      {
        itemId: allItems[0].id,
        movementType: "IN",
        quantityInCrates: "25",
        quantityInBoxes: "0",
        quantityInKgs: "500.0",
        referenceType: "PURCHASE_INVOICE",
        referenceId: invoice1.id,
        movementDate: new Date("2024-01-15"),
        vendorId: allVendors[0].id,
        notes: "Stock received from purchase"
      },
      {
        itemId: allItems[0].id,
        movementType: "OUT",
        quantityInCrates: "10",
        quantityInBoxes: "0",
        quantityInKgs: "200.0",
        referenceType: "SALES_INVOICE", 
        referenceId: null,
        movementDate: new Date("2024-01-16"),
        retailerId: allRetailers[0].id,
        rate: "50.00",
        notes: "Stock sold to retailer"
      },
      {
        itemId: allItems[2].id,
        movementType: "IN",
        quantityInCrates: "0",
        quantityInBoxes: "30",
        quantityInKgs: "300.0",
        referenceType: "PURCHASE_INVOICE",
        referenceId: invoice2.id,
        movementDate: new Date("2024-01-18"),
        vendorId: allVendors[1].id,
        notes: "Apple stock received"
      },
      {
        itemId: allItems[2].id,
        movementType: "OUT",
        quantityInCrates: "0",
        quantityInBoxes: "18",
        quantityInKgs: "180.0",
        referenceType: "SALES_INVOICE",
        referenceId: null,
        movementDate: new Date("2024-01-18"),
        retailerId: allRetailers[1].id,
        rate: "70.00",
        notes: "Apple stock sold"
      },
      {
        itemId: allItems[1].id,
        movementType: "OUT",
        quantityInCrates: "2",
        quantityInBoxes: "0",
        quantityInKgs: "40.0",
        referenceType: "ADJUSTMENT",
        referenceId: null,
        movementDate: new Date("2024-01-19"),
        notes: "Damaged/overripe mangoes"
      }
    ]);

    // Create sales invoices with different statuses
    const [salesInvoice1] = await db.insert(salesInvoices).values({
      retailerId: allRetailers[0].id,
      invoiceNumber: "SI000001",
      invoiceDate: new Date("2024-01-16"),
      totalAmount: "12000.00",
      status: "Paid",
      paidAmount: "12000.00",
      balanceAmount: "0.00"
    }).returning();

    const [salesInvoice2] = await db.insert(salesInvoices).values({
      retailerId: allRetailers[1].id,
      invoiceNumber: "SI000002",
      invoiceDate: new Date("2024-01-18"),
      totalAmount: "8500.00",
      status: "Partially Paid",
      paidAmount: "5000.00",
      balanceAmount: "3500.00"
    }).returning();

    const [salesInvoice3] = await db.insert(salesInvoices).values({
      retailerId: allRetailers[2].id,
      invoiceNumber: "SI000003",
      invoiceDate: new Date("2024-01-20"),
      totalAmount: "15000.00",
      status: "Unpaid",
      paidAmount: "0.00",
      balanceAmount: "15000.00"
    }).returning();

    // Create sales invoice items
    await db.insert(salesInvoiceItems).values([
      {
        invoiceId: salesInvoice1.id,
        itemId: allItems[0].id,
        weight: "200.0",
        crates: "10",
        boxes: "0",
        rate: "50.00",
        amount: "10000.00"
      },
      {
        invoiceId: salesInvoice1.id,
        itemId: allItems[3].id,
        weight: "40.0",
        crates: "0",
        boxes: "0",
        rate: "50.00",
        amount: "2000.00"
      },
      {
        invoiceId: salesInvoice2.id,
        itemId: allItems[2].id,
        weight: "100.0",
        crates: "0",
        boxes: "10",
        rate: "70.00",
        amount: "7000.00"
      },
      {
        invoiceId: salesInvoice2.id,
        itemId: allItems[5].id,
        weight: "60.0",
        crates: "3",
        boxes: "0",
        rate: "25.00",
        amount: "1500.00"
      },
      {
        invoiceId: salesInvoice3.id,
        itemId: allItems[4].id,
        weight: "150.0",
        crates: "0",
        boxes: "15",
        rate: "100.00",
        amount: "15000.00"
      }
    ]);

    // Create sales payments
    await db.insert(salesPayments).values([
      {
        invoiceId: salesInvoice1.id,
        retailerId: allRetailers[0].id,
        amount: "12000.00",
        paymentMode: "Cash",
        paymentDate: new Date("2024-01-16"),
        notes: "Full payment received in cash"
      },
      {
        invoiceId: salesInvoice2.id,
        retailerId: allRetailers[1].id,
        amount: "3000.00",
        paymentMode: "UPI",
        paymentDate: new Date("2024-01-18"),
        upiReference: "UPI987654321",
        notes: "Partial UPI payment"
      },
      {
        invoiceId: salesInvoice2.id,
        retailerId: allRetailers[1].id,
        amount: "2000.00",
        paymentMode: "Cash",
        paymentDate: new Date("2024-01-19"),
        notes: "Additional cash payment"
      }
    ]);

    // Create crate transactions
    await db.insert(crateTransactions).values([
      {
        retailerId: allRetailers[0].id,
        transactionType: "Issue",
        quantity: 20,
        depositAmount: "200.00",
        transactionDate: new Date("2024-01-16"),
        notes: "Crates given with fruits"
      },
      {
        retailerId: allRetailers[0].id,
        transactionType: "Return",
        quantity: 5,
        depositAmount: "50.00",
        transactionDate: new Date("2024-01-17"),
        notes: "Empty crates returned"
      },
      {
        retailerId: allRetailers[1].id,
        transactionType: "Issue",
        quantity: 15,
        depositAmount: "150.00",
        transactionDate: new Date("2024-01-18"),
        notes: "Crates for apple delivery"
      },
      {
        retailerId: allRetailers[2].id,
        transactionType: "Issue",
        quantity: 25,
        depositAmount: "250.00",
        transactionDate: new Date("2024-01-20"),
        notes: "Crates for mixed fruit order"
      },
      {
        retailerId: allRetailers[2].id,
        transactionType: "Return",
        quantity: 3,
        depositAmount: "30.00",
        transactionDate: new Date("2024-01-21"),
        notes: "Partial return of crates"
      }
    ]);

    // Create expenses with different categories and payment modes
    await db.insert(expenses).values([
      {
        categoryId: allExpenseCategories[0].id, // Transport
        amount: "2500.00",
        description: "Truck rental for fruit delivery",
        paymentDate: new Date("2024-01-15"),
        paymentMode: "Cash",
        notes: "Daily truck hire charges"
      },
      {
        categoryId: allExpenseCategories[1].id, // Labor
        amount: "1800.00",
        description: "Loading and unloading charges",
        paymentDate: new Date("2024-01-16"),
        paymentMode: "Cash",
        notes: "Worker payment for 3 days"
      },
      {
        categoryId: allExpenseCategories[2].id, // Market Fee
        amount: "1200.00",
        description: "APMC market fee and commission",
        paymentDate: new Date("2024-01-17"),
        paymentMode: "Bank",
        bankAccountId: allBankAccounts[0].id,
        notes: "Weekly market fee payment"
      },
      {
        categoryId: allExpenseCategories[3].id, // Utilities
        amount: "3200.00",
        description: "Electricity bill for cold storage",
        paymentDate: new Date("2024-01-18"),
        paymentMode: "UPI",
        upiReference: "UPI456789123",
        notes: "Monthly electricity bill"
      },
      {
        categoryId: allExpenseCategories[5].id, // Rent
        amount: "15000.00",
        description: "Shop rent for January",
        paymentDate: new Date("2024-01-01"),
        paymentMode: "Cheque",
        bankAccountId: allBankAccounts[1].id,
        chequeNumber: "CHQ005678",
        notes: "Monthly shop rent"
      }
    ]);

    // Create cashbook entries
    await db.insert(cashbook).values([
      {
        date: new Date("2024-01-15"),
        description: "Cash sales from Raj Retail Store",
        inflow: "12000.00",
        outflow: "0.00",
        balance: "12000.00",
        referenceType: "Sales Invoice",
        referenceId: salesInvoice1.id
      },
      {
        date: new Date("2024-01-15"),
        description: "Transport expense payment",
        inflow: "0.00",
        outflow: "2500.00",
        balance: "9500.00",
        referenceType: "Expense",
        referenceId: allExpenseCategories[0].id
      },
      {
        date: new Date("2024-01-16"),
        description: "Cash payment to Ramesh Supplier",
        inflow: "0.00",
        outflow: "15000.00",
        balance: "-5500.00",
        referenceType: "Payment",
        referenceId: invoice1.id
      },
      {
        date: new Date("2024-01-18"),
        description: "Cash sales partial payment",
        inflow: "3000.00",
        outflow: "0.00",
        balance: "-2500.00",
        referenceType: "Sales Payment",
        referenceId: salesInvoice2.id
      }
    ]);

    // Create bankbook entries
    await db.insert(bankbook).values([
      {
        date: new Date("2024-01-17"),
        description: "Bank transfer to Ramesh Supplier",
        debit: "0.00",
        credit: "7450.00",
        balance: "117550.00",
        bankAccountId: allBankAccounts[0].id,
        referenceType: "Payment",
        referenceId: invoice1.id
      },
      {
        date: new Date("2024-01-17"),
        description: "Market fee payment via bank",
        debit: "0.00",
        credit: "1200.00",
        balance: "116350.00",
        bankAccountId: allBankAccounts[0].id,
        referenceType: "Expense",
        referenceId: allExpenseCategories[2].id
      },
      {
        date: new Date("2024-01-22"),
        description: "Cheque payment to Krishna Produce",
        debit: "0.00",
        credit: "5000.00",
        balance: "80000.00",
        bankAccountId: allBankAccounts[1].id,
        referenceType: "Payment",
        referenceId: invoice2.id
      },
      {
        date: new Date("2024-01-01"),
        description: "Shop rent payment via cheque",
        debit: "0.00",
        credit: "15000.00",
        balance: "65000.00",
        bankAccountId: allBankAccounts[1].id,
        referenceType: "Expense",
        referenceId: allExpenseCategories[5].id
      }
    ]);

    console.log("Database initialized successfully with comprehensive dummy data!");
    console.log("Created:");
    console.log("- 3 Users (Admin, Operator, Accountant)");
    console.log("- 3 Vendors with different balances");
    console.log("- 6 Items across different vendors");
    console.log("- 4 Retailers with varying balances");
    console.log("- 2 Bank accounts");
    console.log("- 7 Expense categories");
    console.log("- 3 Purchase invoices (Paid, Partially Paid, Unpaid)");
    console.log("- 4 Invoice items across purchases");
    console.log("- 4 Payments with different modes");
    console.log("- 6 Stock entries for all items");
    console.log("- 5 Stock movements (IN/OUT/Wastage)");
    console.log("- 3 Sales invoices with different statuses");
    console.log("- 5 Sales invoice items");
    console.log("- 3 Sales payments");
    console.log("- 5 Crate transactions");
    console.log("- 5 Expenses across categories");
    console.log("- 4 Cashbook entries");
    console.log("- 4 Bankbook entries");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}