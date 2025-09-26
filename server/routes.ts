import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import { z } from "zod";
import type { SortOrder } from "@shared/schema";
import { authenticateToken, requireRole, signToken } from "./src/middleware/auth";
import { UserRole } from "./src/types";
import { 
  insertUserSchema,
  insertVendorSchema,
  insertItemSchema,
  insertBankAccountSchema,
  insertPurchaseInvoiceSchema,
  insertInvoiceItemSchema,
  insertPaymentSchema,
  insertStockSchema,
  insertStockMovementSchema,
  insertRetailerSchema,
  insertSalesInvoiceSchema,
  insertSalesInvoiceItemSchema,
  insertSalesPaymentSchema,
  insertCrateTransactionSchema,
  insertExpenseCategorySchema,
  insertExpenseSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint to stop continuous HEAD calls
  app.head("/api", (req, res) => {
    res.status(200).end();
  });

  app.get("/api", (req, res) => {
    res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
  });

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = signToken({ id: user.id, username: user.username, role: user.role as UserRole });

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/register", authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      
      res.status(201).json({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Vendor routes
  // Pagination Response Format: { data: T[], pagination: { page, limit, total, totalPages, hasNext, hasPrevious } }
  // Note: totalPages is always >= 1, even when total = 0, to ensure consistent UI behavior
  app.get("/api/vendors", authenticateToken, async (req, res) => {
    try {
      // Check if pagination is requested
      const isPaginated = req.query.page || req.query.limit || req.query.paginated === 'true';
      
      if (!isPaginated) {
        // Return original array response for backward compatibility
        const vendors = await storage.getVendors();
        res.json(vendors);
        return;
      }

      // Extract pagination query parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const sortBy = req.query.sortBy as string;
      const sortOrder: SortOrder = (req.query.sortOrder as string) === 'desc' ? 'desc' : 'asc';
      
      // Validate pagination parameters
      if (page < 1) {
        return res.status(400).json({ message: "Page must be >= 1" });
      }
      
      if (limit < 1 || limit > 100) {
        return res.status(400).json({ message: "Limit must be between 1 and 100" });
      }
      
      // Validate sortBy if provided
      const validSortFields = ['name', 'contactPerson', 'createdAt'];
      if (sortBy && !validSortFields.includes(sortBy)) {
        return res.status(400).json({ message: "Invalid sortBy field" });
      }
      
      const paginationOptions = { page, limit, search, sortBy, sortOrder };
      const result = await storage.getVendorsPaginated(paginationOptions);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  app.get("/api/vendors/:id", authenticateToken, async (req, res) => {
    try {
      const vendor = await storage.getVendor(req.params.id);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vendor" });
    }
  });

  app.post("/api/vendors", authenticateToken, requireRole([UserRole.ADMIN, UserRole.OPERATOR]), async (req, res) => {
    try {
      const vendorData = insertVendorSchema.parse(req.body);
      const vendor = await storage.createVendor(vendorData);
      res.status(201).json(vendor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create vendor" });
    }
  });

  app.put("/api/vendors/:id", authenticateToken, requireRole([UserRole.ADMIN, UserRole.OPERATOR]), async (req, res) => {
    try {
      const vendorData = insertVendorSchema.partial().parse(req.body);
      const vendor = await storage.updateVendor(req.params.id, vendorData);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update vendor" });
    }
  });

  app.delete("/api/vendors/:id", authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const success = await storage.deleteVendor(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      res.json({ message: "Vendor deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete vendor" });
    }
  });

  // Items routes
  app.get("/api/items", authenticateToken, async (req, res) => {
    try {
      // Check if pagination is requested
      const isPaginated = req.query.page || req.query.limit || req.query.paginated === 'true';
      
      if (!isPaginated) {
        // Return original array response for backward compatibility
        const items = await storage.getItems();
        res.json(items);
        return;
      }

      // Extract pagination query parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const sortBy = req.query.sortBy as string;
      const sortOrder: SortOrder = (req.query.sortOrder as string) === 'desc' ? 'desc' : 'asc';
      
      // Validate pagination parameters
      if (page < 1) {
        return res.status(400).json({ message: "Page must be >= 1" });
      }
      
      if (limit < 1 || limit > 100) {
        return res.status(400).json({ message: "Limit must be between 1 and 100" });
      }
      
      // Validate sortBy if provided
      const validSortFields = ['name', 'quality', 'unit', 'createdAt'];
      if (sortBy && !validSortFields.includes(sortBy)) {
        return res.status(400).json({ message: "Invalid sortBy field" });
      }
      
      const paginationOptions = { page, limit, search, sortBy, sortOrder };
      const result = await storage.getItemsPaginated(paginationOptions);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch items" });
    }
  });

  app.get("/api/items/vendor/:vendorId", authenticateToken, async (req, res) => {
    try {
      const items = await storage.getItemsByVendor(req.params.vendorId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch items" });
    }
  });

  app.post("/api/items", authenticateToken, requireRole([UserRole.ADMIN, UserRole.OPERATOR]), async (req, res) => {
    try {
      const itemData = insertItemSchema.parse(req.body);
      const item = await storage.createItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create item" });
    }
  });

  app.put("/api/items/:id", authenticateToken, requireRole([UserRole.ADMIN, UserRole.OPERATOR]), async (req, res) => {
    try {
      const itemData = insertItemSchema.partial().parse(req.body);
      const item = await storage.updateItem(req.params.id, itemData);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update item" });
    }
  });

  app.delete("/api/items/:id", authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const success = await storage.deleteItem(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.json({ message: "Item deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete item" });
    }
  });

  // Bank account routes
  app.get("/api/bank-accounts", authenticateToken, async (req, res) => {
    try {
      const accounts = await storage.getBankAccounts();
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bank accounts" });
    }
  });

  app.post("/api/bank-accounts", authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const accountData = insertBankAccountSchema.parse(req.body);
      const account = await storage.createBankAccount(accountData);
      res.status(201).json(account);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create bank account" });
    }
  });

  // Purchase invoice routes
  app.get("/api/purchase-invoices", authenticateToken, async (req, res) => {
    try {
      const { page, limit, search, sortBy, sortOrder, paginated, status, vendorId, dateFrom, dateTo } = req.query;
      
      // Support both paginated and non-paginated responses for backward compatibility
      if (paginated === 'true') {
        const pageNum = parseInt(page as string) || 1;
        const limitNum = Math.min(parseInt(limit as string) || 10, 100);
        
        const result = await storage.getPurchaseInvoicesPaginated({
          page: pageNum,
          limit: limitNum,
          search: search as string,
          sortBy: sortBy as string,
          sortOrder: sortOrder as SortOrder,
          status: status as 'paid' | 'unpaid',
          vendorId: vendorId as string,
          dateRange: dateFrom || dateTo ? {
            from: dateFrom as string,
            to: dateTo as string
          } : undefined
        });
        
        res.json({ data: result.data, pagination: result.pagination });
      } else {
        const invoices = await storage.getPurchaseInvoices();
        res.json(invoices);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get("/api/purchase-invoices/:id", authenticateToken, async (req, res) => {
    try {
      const invoice = await storage.getPurchaseInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.post("/api/purchase-invoices", authenticateToken, requireRole([UserRole.ADMIN, UserRole.OPERATOR]), async (req, res) => {
    try {
      const { invoice, items, stockOutEntryIds } = req.body;
      
      if (!invoice || !items || !Array.isArray(items)) {
        return res.status(400).json({ message: "Invoice and items are required" });
      }

      const invoiceData = insertPurchaseInvoiceSchema.parse(invoice);
      const itemsData = items.map((item: any) => insertInvoiceItemSchema.parse({ ...item, invoiceId: "" }));
      
      const createdInvoice = await storage.createPurchaseInvoice(invoiceData, itemsData);
      res.status(201).json(createdInvoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  // Payment routes
  app.get("/api/payments", authenticateToken, async (req, res) => {
    try {
      const payments = await storage.getPayments();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.get("/api/payments/invoice/:invoiceId", authenticateToken, async (req, res) => {
    try {
      const payments = await storage.getPaymentsByInvoice(req.params.invoiceId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.post("/api/payments", authenticateToken, requireRole([UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.OPERATOR]), async (req, res) => {
    try {
      const paymentData = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(paymentData);
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create payment" });
    }
  });

  // Stock routes
  app.get("/api/stock", authenticateToken, async (req, res) => {
    try {
      const { page, limit, search, sortBy, sortOrder, paginated, lowStock } = req.query;
      
      // Support both paginated and non-paginated responses for backward compatibility
      if (paginated === 'true') {
        const pageNum = parseInt(page as string) || 1;
        const limitNum = Math.min(parseInt(limit as string) || 10, 100);
        
        const result = await storage.getStockPaginated({
          page: pageNum,
          limit: limitNum,
          search: search as string,
          sortBy: sortBy as string,
          sortOrder: sortOrder as SortOrder,
          lowStock: lowStock === 'true'
        });
        
        res.json({ data: result.data, pagination: result.pagination });
      } else {
        const stock = await storage.getStock();
        res.json(stock);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stock" });
    }
  });

  app.put("/api/stock/:itemId", authenticateToken, requireRole([UserRole.ADMIN, UserRole.OPERATOR]), async (req, res) => {
    try {
      const stockData = insertStockSchema.partial().parse(req.body);
      const stock = await storage.updateStock(req.params.itemId, stockData);
      res.json(stock);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update stock" });
    }
  });

  // Stock movement routes
  app.get("/api/stock-movements", authenticateToken, async (req, res) => {
    try {
      const movements = await storage.getStockMovements();
      res.json(movements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stock movements" });
    }
  });

  app.get("/api/stock-movements/item/:itemId", authenticateToken, async (req, res) => {
    try {
      const movements = await storage.getStockMovementsByItem(req.params.itemId);
      res.json(movements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stock movements for item" });
    }
  });

  app.get("/api/stock-movements/vendor/:vendorId/available", authenticateToken, async (req, res) => {
    try {
      const movements = await storage.getAvailableStockOutEntriesByVendor(req.params.vendorId);
      res.json(movements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch available stock out entries for vendor" });
    }
  });

  app.post("/api/stock-movements", authenticateToken, requireRole([UserRole.ADMIN, UserRole.OPERATOR]), async (req, res) => {
    try {
      const movementData = insertStockMovementSchema.parse(req.body);
      const movement = await storage.createStockMovement(movementData);
      res.status(201).json(movement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create stock movement" });
    }
  });

  app.get("/api/stock/balance/:itemId", authenticateToken, async (req, res) => {
    try {
      const balance = await storage.calculateStockBalance(req.params.itemId);
      res.json(balance);
    } catch (error) {
      res.status(500).json({ message: "Failed to calculate stock balance" });
    }
  });

  // Ledger and book routes
  app.get("/api/ledger/vendor/:vendorId", authenticateToken, async (req, res) => {
    try {
      const ledger = await storage.getVendorLedger(req.params.vendorId);
      res.json(ledger);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vendor ledger" });
    }
  });

  app.get("/api/cashbook", authenticateToken, async (req, res) => {
    try {
      const cashbook = await storage.getCashbook();
      res.json(cashbook);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cashbook" });
    }
  });

  app.get("/api/bankbook", authenticateToken, async (req, res) => {
    try {
      const bankAccountId = req.query.bankAccountId as string;
      const bankbook = await storage.getBankbook(bankAccountId);
      res.json(bankbook);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bankbook" });
    }
  });

  // User management routes
  app.get("/api/users", authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      // Check if pagination is requested
      const isPaginated = req.query.page || req.query.limit || req.query.paginated === 'true';
      
      if (!isPaginated) {
        // Return original array response for backward compatibility
        const users = await storage.getUsers();
        // Remove passwords from response
        const safeUsers = users.map(({ password, ...user }) => user);
        res.json(safeUsers);
        return;
      }

      // Extract pagination query parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const sortBy = req.query.sortBy as string;
      const sortOrder: SortOrder = (req.query.sortOrder as string) === 'desc' ? 'desc' : 'asc';
      
      // Validate pagination parameters
      if (page < 1) {
        return res.status(400).json({ message: "Page must be >= 1" });
      }
      
      if (limit < 1 || limit > 100) {
        return res.status(400).json({ message: "Limit must be between 1 and 100" });
      }
      
      // Validate sortBy if provided
      const validSortFields = ['username', 'name', 'role', 'createdAt'];
      if (sortBy && !validSortFields.includes(sortBy)) {
        return res.status(400).json({ message: "Invalid sortBy field" });
      }
      
      const paginationOptions = { page, limit, search, sortBy, sortOrder };
      const result = await storage.getUsersPaginated(paginationOptions);
      
      // Remove passwords from response
      const safeData = result.data.map(({ password, ...user }) => user);
      const safeResult = { ...result, data: safeData };
      
      res.json(safeResult);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      // Remove password from response
      const { password, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put("/api/users/:id", authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const userData = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(req.params.id, userData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Remove password from response
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const success = await storage.deleteUser(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.put("/api/users/:id/permissions", authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const { permissions } = req.body;
      if (!Array.isArray(permissions)) {
        return res.status(400).json({ message: "Permissions must be an array" });
      }
      
      const user = await storage.updateUserPermissions(req.params.id, permissions);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user permissions" });
    }
  });

  // Retailer routes
  app.get("/api/retailers", authenticateToken, async (req, res) => {
    try {
      const { page, limit, search, sortBy, sortOrder, paginated, status } = req.query;
      
      // Support both paginated and non-paginated responses for backward compatibility
      if (paginated === 'true') {
        const pageNum = parseInt(page as string) || 1;
        const limitNum = Math.min(parseInt(limit as string) || 10, 100);
        
        const result = await storage.getRetailersPaginated({
          page: pageNum,
          limit: limitNum,
          search: search as string,
          sortBy: sortBy as string,
          sortOrder: sortOrder as SortOrder,
          status: status as 'active' | 'inactive'
        });
        
        res.json({ data: result.data, pagination: result.pagination });
      } else {
        const retailers = await storage.getRetailers();
        res.json(retailers);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch retailers" });
    }
  });

  app.get("/api/retailers/:id", authenticateToken, async (req, res) => {
    try {
      const retailer = await storage.getRetailer(req.params.id);
      if (!retailer) {
        return res.status(404).json({ message: "Retailer not found" });
      }
      res.json(retailer);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch retailer" });
    }
  });

  app.post("/api/retailers", authenticateToken, async (req, res) => {
    try {
      const retailerData = insertRetailerSchema.parse(req.body);
      const retailer = await storage.createRetailer(retailerData);
      res.status(201).json(retailer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create retailer" });
    }
  });

  app.put("/api/retailers/:id", authenticateToken, async (req, res) => {
    try {
      const retailerData = insertRetailerSchema.partial().parse(req.body);
      const retailer = await storage.updateRetailer(req.params.id, retailerData);
      if (!retailer) {
        return res.status(404).json({ message: "Retailer not found" });
      }
      res.json(retailer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update retailer" });
    }
  });

  app.delete("/api/retailers/:id", authenticateToken, async (req, res) => {
    try {
      const success = await storage.deleteRetailer(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Retailer not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete retailer" });
    }
  });

  // Sales Invoice routes
  app.get("/api/sales-invoices", authenticateToken, async (req, res) => {
    try {
      const { page, limit, search, sortBy, sortOrder, paginated, status, retailerId, dateFrom, dateTo } = req.query;
      
      // Support both paginated and non-paginated responses for backward compatibility
      if (paginated === 'true') {
        const pageNum = parseInt(page as string) || 1;
        const limitNum = Math.min(parseInt(limit as string) || 10, 100);
        
        const result = await storage.getSalesInvoicesPaginated({
          page: pageNum,
          limit: limitNum,
          search: search as string,
          sortBy: sortBy as string,
          sortOrder: sortOrder as SortOrder,
          status: status as 'paid' | 'unpaid',
          retailerId: retailerId as string,
          dateRange: dateFrom || dateTo ? {
            from: dateFrom as string,
            to: dateTo as string
          } : undefined
        });
        
        res.json({ data: result.data, pagination: result.pagination });
      } else {
        const invoices = await storage.getSalesInvoices();
        res.json(invoices);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sales invoices" });
    }
  });

  app.get("/api/sales-invoices/:id", authenticateToken, async (req, res) => {
    try {
      const invoice = await storage.getSalesInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Sales invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sales invoice" });
    }
  });

  app.post("/api/sales-invoices", authenticateToken, async (req, res) => {
    try {
      const { invoice, items } = req.body;
      
      if (!invoice || !items || !Array.isArray(items)) {
        return res.status(400).json({ message: "Invoice and items are required" });
      }

      const invoiceData = insertSalesInvoiceSchema.parse(invoice);
      const itemsData = items.map((item: any) => insertSalesInvoiceItemSchema.parse({ ...item, invoiceId: "" }));
      
      const createdInvoice = await storage.createSalesInvoice(invoiceData, itemsData);
      res.status(201).json(createdInvoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create sales invoice" });
    }
  });

  // Sales Payment routes
  app.get("/api/sales-payments", authenticateToken, async (req, res) => {
    try {
      const payments = await storage.getSalesPayments();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sales payments" });
    }
  });

  app.get("/api/sales-payments/invoice/:invoiceId", authenticateToken, async (req, res) => {
    try {
      const payments = await storage.getSalesPaymentsByInvoice(req.params.invoiceId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payments for invoice" });
    }
  });

  app.post("/api/sales-payments", authenticateToken, async (req, res) => {
    try {
      const paymentData = insertSalesPaymentSchema.parse(req.body);
      const payment = await storage.createSalesPayment(paymentData);
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create sales payment" });
    }
  });

  app.post("/api/sales-invoices/:id/mark-paid", authenticateToken, async (req, res) => {
    try {
      const invoiceId = req.params.id;
      const result = await storage.markSalesInvoiceAsPaid(invoiceId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark invoice as paid" });
    }
  });

  // Crate Transaction routes
  app.get("/api/crate-transactions", authenticateToken, async (req, res) => {
    try {
      const { page, limit, search, sortBy, sortOrder, paginated, type, retailerId, dateFrom, dateTo } = req.query;
      
      // Support both paginated and non-paginated responses for backward compatibility
      if (paginated === 'true') {
        const pageNum = parseInt(page as string) || 1;
        const limitNum = Math.min(parseInt(limit as string) || 10, 100);
        
        const result = await storage.getCrateTransactionsPaginated({
          page: pageNum,
          limit: limitNum,
          search: search as string,
          sortBy: sortBy as string,
          sortOrder: sortOrder as SortOrder,
          type: type as 'given' | 'returned',
          retailerId: retailerId as string,
          dateRange: dateFrom || dateTo ? {
            from: dateFrom as string,
            to: dateTo as string
          } : undefined
        });
        
        res.json({ data: result.data, pagination: result.pagination });
      } else {
        const transactions = await storage.getCrateTransactions();
        res.json(transactions);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch crate transactions" });
    }
  });

  app.get("/api/crate-transactions/retailer/:retailerId", authenticateToken, async (req, res) => {
    try {
      const transactions = await storage.getCrateTransactionsByRetailer(req.params.retailerId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch crate transactions for retailer" });
    }
  });

  app.post("/api/crate-transactions", authenticateToken, async (req, res) => {
    try {
      const transactionData = insertCrateTransactionSchema.parse(req.body);
      const transaction = await storage.createCrateTransaction(transactionData);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create crate transaction" });
    }
  });

  // Expense Category routes
  app.get("/api/expense-categories", authenticateToken, async (req, res) => {
    try {
      const categories = await storage.getExpenseCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expense categories" });
    }
  });

  app.get("/api/expense-categories/:id", authenticateToken, async (req, res) => {
    try {
      const category = await storage.getExpenseCategory(req.params.id);
      if (!category) {
        return res.status(404).json({ message: "Expense category not found" });
      }
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expense category" });
    }
  });

  app.post("/api/expense-categories", authenticateToken, async (req, res) => {
    try {
      const categoryData = insertExpenseCategorySchema.parse(req.body);
      const category = await storage.createExpenseCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create expense category" });
    }
  });

  app.put("/api/expense-categories/:id", authenticateToken, async (req, res) => {
    try {
      const categoryData = insertExpenseCategorySchema.partial().parse(req.body);
      const category = await storage.updateExpenseCategory(req.params.id, categoryData);
      if (!category) {
        return res.status(404).json({ message: "Expense category not found" });
      }
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update expense category" });
    }
  });

  app.delete("/api/expense-categories/:id", authenticateToken, async (req, res) => {
    try {
      const success = await storage.deleteExpenseCategory(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Expense category not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete expense category" });
    }
  });

  // Expense routes
  app.get("/api/expenses", authenticateToken, async (req, res) => {
    try {
      const expenses = await storage.getExpenses();
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.get("/api/expenses/:id", authenticateToken, async (req, res) => {
    try {
      const expense = await storage.getExpense(req.params.id);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expense" });
    }
  });

  app.post("/api/expenses", authenticateToken, async (req, res) => {
    try {
      const expenseData = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(expenseData);
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  // Enhanced Ledger routes
  app.get("/api/ledgers/retailer/:retailerId", authenticateToken, async (req, res) => {
    try {
      const ledger = await storage.getRetailerLedger(req.params.retailerId);
      res.json(ledger);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch retailer ledger" });
    }
  });

  app.get("/api/ledgers/udhaar", authenticateToken, async (req, res) => {
    try {
      const udhaaarBook = await storage.getUdhaaarBook();
      res.json(udhaaarBook);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch udhaar book" });
    }
  });

  app.get("/api/ledgers/crates", authenticateToken, async (req, res) => {
    try {
      const retailerId = req.query.retailerId as string;
      const crateLedger = await storage.getCrateLedger(retailerId);
      res.json(crateLedger);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch crate ledger" });
    }
  });

  // Dashboard KPIs
  app.get("/api/dashboard/kpis", authenticateToken, async (req, res) => {
    try {
      const kpis = await storage.getDashboardKPIs();
      res.json(kpis);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard KPIs" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
