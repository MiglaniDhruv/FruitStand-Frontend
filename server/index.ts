import express, { type Request, Response, NextFunction } from "express";
import "dotenv/config";
import { setupVite, serveStatic, log } from "./vite";
import { extractTenantSlug } from "./src/middleware/tenant-slug";
import { SYSTEM_ROUTES } from "./src/constants/routes";
import { ERROR_CODES } from "./src/constants/error-codes";

// Import all modular routers
import { authRouter } from "./src/modules/auth";
import { bankAccountRouter } from "./src/modules/bank-accounts";
import { userRouter } from "./src/modules/users";
import { vendorRouter } from "./src/modules/vendors";
import { itemRouter } from "./src/modules/items";
import { stockRouter } from "./src/modules/stock";
import { purchaseInvoiceRouter } from "./src/modules/purchase-invoices";
import { paymentRouter } from "./src/modules/payments";
import { retailerRouter } from "./src/modules/retailers";
import { salesInvoiceRouter } from "./src/modules/sales-invoices";
import { salesPaymentRouter } from "./src/modules/sales-payments";
import { crateRouter } from "./src/modules/crates";
import { expenseRouter } from "./src/modules/expenses";
import { ledgerRouter } from "./src/modules/ledgers";
import { dashboardRouter } from "./src/modules/dashboard";
import { tenantRouter } from "./src/modules/tenants";
import { whatsappRouter } from "./src/modules/whatsapp";
import { publicRouter } from "./src/modules/public/router";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const contentLength = res.get('content-length') || '0';
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms [${contentLength}b]`;

      // Only log response bodies in development and for small payloads
      if (process.env.NODE_ENV === 'development' && parseInt(contentLength) < 1000) {
        // In development, we might want to see the response for debugging
        // But we don't override res.json for this - keeping it lightweight
      }

      if (logLine.length > 100) {
        logLine = logLine.slice(0, 99) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// URL normalization middleware - strip /:slug from paths matching /:slug/api/*
// Runs before all app.use('/api', ...) calls to ensure proper routing
app.use((req, res, next) => {
  const path = req.path;
  
  // System routes that shouldn't be processed - skip normalization
  const firstSegment = path.split('/')[1];
  
  if (SYSTEM_ROUTES.has(firstSegment)) {
    return next();
  }
  
  // Check if path matches /:slug/api/* pattern
  const slugApiMatch = path.match(/^\/([^\/]+)\/api(\/.*)?$/);
  
  if (slugApiMatch) {
    // Strip the slug prefix, keeping the /api part
    const normalizedPath = '/api' + (slugApiMatch[2] || '');
    req.url = normalizedPath + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');
    // Use Object.defineProperty to update the read-only path
    Object.defineProperty(req, 'path', {
      value: normalizedPath,
      writable: false,
      enumerable: true,
      configurable: true
    });
  }
  
  next();
});

// Apply tenant slug middleware before route handlers
app.use(extractTenantSlug);

(async () => {
  // Initialize database with default data
  try {
    const { initializeDatabase } = await import("./initializeDatabase");
    await initializeDatabase();
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }

  // Initialize WhatsApp payment reminder scheduler
  try {
    const { initializePaymentReminderScheduler } = await import("./src/services/whatsapp");
    await initializePaymentReminderScheduler();
    console.log("WhatsApp payment reminder scheduler initialized");
  } catch (error) {
    console.error("Failed to initialize WhatsApp scheduler:", error);
  }

  // Mount public router first (no authentication required)
  app.use("/api/public", publicRouter);

  // Mount all modular routers (routes already include /api prefix)
  app.use("/api", authRouter.getRouter());
  app.use("/api", bankAccountRouter.getRouter());
  app.use("/api", userRouter.getRouter());
  app.use("/api", vendorRouter.getRouter());
  app.use("/api", itemRouter.getRouter());
  app.use("/api", stockRouter.getRouter());
  app.use("/api", purchaseInvoiceRouter.getRouter());
  app.use("/api", paymentRouter.getRouter());
  app.use("/api", retailerRouter.getRouter());
  app.use("/api", salesInvoiceRouter.getRouter());
  app.use("/api", salesPaymentRouter.getRouter());
  app.use("/api", crateRouter.getRouter());
  app.use("/api", expenseRouter.getRouter());
  app.use("/api", ledgerRouter.getRouter());
  app.use("/api", dashboardRouter.getRouter());
  app.use("/api", tenantRouter.getRouter());
  app.use("/api", whatsappRouter.getRouter());

  // Setup server for WebSocket support (required for Vite HMR)
  const { createServer } = await import("http");
  const server = createServer(app);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    await setupVite(app, server);
  }

  // Handle 404 for API routes (after Vite setup)
  app.use("/api/*", (req: Request, res: Response) => {
    log(`404 - API route not found: ${req.method} ${req.path}`);
    res.status(404).json({ 
      success: false,
      error: {
        message: "API route not found",
        code: ERROR_CODES.RESOURCE_NOT_FOUND,
        statusCode: 404
      }
    });
  });

  // Global error handling middleware (must be last)
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    // Import required utilities
    const { AppError, ValidationError, InternalServerError } = require('./src/types');
    const { logError } = require('./src/utils/error-logger');
    const { handleDatabaseError } = require('./src/utils/database-errors');
    const { ZodError } = require('zod');

    let error = err;

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      error = new ValidationError('Validation failed', error);
    }

    // Handle database errors
    if (error && error.code && typeof error.code === 'string') {
      try {
        handleDatabaseError(error);
      } catch (dbError) {
        error = dbError;
      }
    }

    // Handle custom AppError instances
    if (error instanceof AppError) {
      // Extract context information from request
      const context = {
        userId: (req as any).user?.id,
        tenantId: (req as any).tenantId,
        method: req.method,
        path: req.path,
        body: req.body,
        query: req.query,
        params: req.params,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      };

      // Log error with context
      logError(error, context);

      // Return structured error response
      const response: any = {
        success: false,
        error: {
          message: error.message,
          code: error.code,
          statusCode: error.statusCode,
        },
      };

      // Include details for validation errors
      if (error.details) {
        response.error.details = error.details;
      }

      // Include stack trace only in development
      if (process.env.NODE_ENV === 'development') {
        response.error.stack = error.stack;
      }

      return res.status(error.statusCode).json(response);
    }

    // Handle unknown errors
    const internalError = new InternalServerError('An unexpected error occurred');
    const context = {
      userId: (req as any).user?.id,
      tenantId: (req as any).tenantId,
      method: req.method,
      path: req.path,
      body: req.body,
      query: req.query,
      params: req.params,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    };

    logError(internalError, context);

    const response: any = {
      success: false,
      error: {
        message: internalError.message,
        code: internalError.code,
        statusCode: internalError.statusCode,
      },
    };

    // Include original error details in development
    if (process.env.NODE_ENV === 'development') {
      response.error.originalError = err.message;
      response.error.stack = err.stack;
    }

    return res.status(500).json(response);
  });

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
