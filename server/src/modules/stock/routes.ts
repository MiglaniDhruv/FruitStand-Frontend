import { BaseRouter } from "../../utils/base";
import { StockController } from "./controller";
import { authenticateToken, requireRole, validateTenant, attachTenantContext } from "../../middleware/auth";
import { UserRole } from "../../types";

export class StockRouter extends BaseRouter {
  private stockController: StockController;

  constructor() {
    super();
    this.stockController = new StockController();
    this.setupRoutes();
  }

  private setupRoutes() {
    // GET /stock - List stock with pagination and filtering support
    this.router.get("/stock", 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.stockController.getAll.bind(this.stockController)
    );

    // PUT /stock/:itemId - Update stock
    this.router.put("/stock/:itemId", 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      requireRole([UserRole.ADMIN, UserRole.OPERATOR]), 
      this.stockController.updateStock.bind(this.stockController)
    );

    // GET /stock-movements - List stock movements
    this.router.get("/stock-movements", 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.stockController.getMovements.bind(this.stockController)
    );

    // GET /stock-movements/item/:itemId - Get stock movements by item
    this.router.get("/stock-movements/item/:itemId", 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.stockController.getMovementsByItem.bind(this.stockController)
    );

    // GET /stock-movements/vendor/:vendorId/available - Get available stock out entries by vendor
    this.router.get("/stock-movements/vendor/:vendorId/available", 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.stockController.getAvailableOutEntriesByVendor.bind(this.stockController)
    );

    // POST /stock-movements - Create stock movement
    this.router.post("/stock-movements", 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      requireRole([UserRole.ADMIN, UserRole.OPERATOR]), 
      this.stockController.createMovement.bind(this.stockController)
    );

    // GET /stock/balance/:itemId - Calculate stock balance
    this.router.get("/stock/balance/:itemId", 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.stockController.calculateBalance.bind(this.stockController)
    );
  }
}