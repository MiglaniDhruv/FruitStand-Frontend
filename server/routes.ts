import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { 
  insertUserSchema,
  insertVendorSchema,
  insertCommoditySchema,
  insertBankAccountSchema,
  insertPurchaseInvoiceSchema,
  insertInvoiceItemSchema,
  insertPaymentSchema,
  insertStockSchema
} from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middleware to verify JWT token
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Role-based access control
const requireRole = (roles: string[]) => (req: any, res: any, next: any) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
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

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

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

  app.post("/api/auth/register", authenticateToken, requireRole(["Admin"]), async (req, res) => {
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
  app.get("/api/vendors", authenticateToken, async (req, res) => {
    try {
      const vendors = await storage.getVendors();
      res.json(vendors);
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

  app.post("/api/vendors", authenticateToken, requireRole(["Admin", "Operator"]), async (req, res) => {
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

  app.put("/api/vendors/:id", authenticateToken, requireRole(["Admin", "Operator"]), async (req, res) => {
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

  app.delete("/api/vendors/:id", authenticateToken, requireRole(["Admin"]), async (req, res) => {
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

  // Commodity routes
  app.get("/api/commodities", authenticateToken, async (req, res) => {
    try {
      const commodities = await storage.getCommodities();
      res.json(commodities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch commodities" });
    }
  });

  app.get("/api/commodities/vendor/:vendorId", authenticateToken, async (req, res) => {
    try {
      const commodities = await storage.getCommoditiesByVendor(req.params.vendorId);
      res.json(commodities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch commodities" });
    }
  });

  app.post("/api/commodities", authenticateToken, requireRole(["Admin", "Operator"]), async (req, res) => {
    try {
      const commodityData = insertCommoditySchema.parse(req.body);
      const commodity = await storage.createCommodity(commodityData);
      res.status(201).json(commodity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create commodity" });
    }
  });

  app.put("/api/commodities/:id", authenticateToken, requireRole(["Admin", "Operator"]), async (req, res) => {
    try {
      const commodityData = insertCommoditySchema.partial().parse(req.body);
      const commodity = await storage.updateCommodity(req.params.id, commodityData);
      if (!commodity) {
        return res.status(404).json({ message: "Commodity not found" });
      }
      res.json(commodity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update commodity" });
    }
  });

  app.delete("/api/commodities/:id", authenticateToken, requireRole(["Admin"]), async (req, res) => {
    try {
      const success = await storage.deleteCommodity(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Commodity not found" });
      }
      res.json({ message: "Commodity deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete commodity" });
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

  app.post("/api/bank-accounts", authenticateToken, requireRole(["Admin"]), async (req, res) => {
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
      const invoices = await storage.getPurchaseInvoices();
      res.json(invoices);
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

  app.post("/api/purchase-invoices", authenticateToken, requireRole(["Admin", "Operator"]), async (req, res) => {
    try {
      const { invoice, items } = req.body;
      
      const invoiceData = insertPurchaseInvoiceSchema.parse(invoice);
      const itemsData = z.array(insertInvoiceItemSchema.omit({ invoiceId: true })).parse(items);
      
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

  app.post("/api/payments", authenticateToken, requireRole(["Admin", "Accountant", "Operator"]), async (req, res) => {
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
      const stock = await storage.getStock();
      res.json(stock);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stock" });
    }
  });

  app.put("/api/stock/:commodityId", authenticateToken, requireRole(["Admin", "Operator"]), async (req, res) => {
    try {
      const stockData = insertStockSchema.partial().parse(req.body);
      const stock = await storage.updateStock(req.params.commodityId, stockData);
      res.json(stock);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update stock" });
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
