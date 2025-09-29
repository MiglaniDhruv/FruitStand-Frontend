import { BaseRouter } from "../../utils/base";
import { VendorController } from "./controller";
import { authenticateToken, requireRole, validateTenant, attachTenantContext } from "../../middleware/auth";
import { UserRole } from "../../types";

export class VendorRouter extends BaseRouter {
  private vendorController: VendorController;

  constructor() {
    super();
    this.vendorController = new VendorController();
    this.setupRoutes();
  }

  private setupRoutes() {
    // GET /vendors - List vendors with pagination support
    this.router.get("/vendors", 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.vendorController.getAll.bind(this.vendorController)
    );

    // GET /vendors/:id - Get vendor by ID
    this.router.get("/vendors/:id", 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.vendorController.getById.bind(this.vendorController)
    );

    // POST /vendors - Create new vendor
    this.router.post("/vendors", 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      requireRole([UserRole.ADMIN, UserRole.OPERATOR]), 
      this.vendorController.create.bind(this.vendorController)
    );

    // PUT /vendors/:id - Update vendor
    this.router.put("/vendors/:id", 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      requireRole([UserRole.ADMIN, UserRole.OPERATOR]), 
      this.vendorController.update.bind(this.vendorController)
    );

    // DELETE /vendors/:id - Delete vendor (Admin only)
    this.router.delete("/vendors/:id", 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      requireRole([UserRole.ADMIN]), 
      this.vendorController.delete.bind(this.vendorController)
    );
  }
}