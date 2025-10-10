import { BaseRouter } from "../../utils/base";
import { VendorController } from "./controller";
import { authenticateToken, requireRole, validateTenant, attachTenantContext } from "../../middleware/auth";
import { UserRole } from "../../types";
import { asyncHandler } from "../../utils/async-handler";

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
      asyncHandler(validateTenant),
      attachTenantContext,
      asyncHandler(this.vendorController.getAll.bind(this.vendorController))
    );

    // GET /vendors/:id - Get vendor by ID
    this.router.get("/vendors/:id", 
      authenticateToken, 
      asyncHandler(validateTenant),
      attachTenantContext,
      asyncHandler(this.vendorController.getById.bind(this.vendorController))
    );

    // POST /vendors - Create new vendor
    this.router.post("/vendors", 
      authenticateToken, 
      asyncHandler(validateTenant),
      attachTenantContext,
      asyncHandler(requireRole([UserRole.ADMIN, UserRole.OPERATOR])), 
      asyncHandler(this.vendorController.create.bind(this.vendorController))
    );

    // PUT /vendors/:id - Update vendor
    this.router.put("/vendors/:id", 
      authenticateToken, 
      asyncHandler(validateTenant),
      attachTenantContext,
      asyncHandler(requireRole([UserRole.ADMIN, UserRole.OPERATOR])), 
      asyncHandler(this.vendorController.update.bind(this.vendorController))
    );

    // DELETE /vendors/:id - Delete vendor (Admin only)
    this.router.delete("/vendors/:id", 
      authenticateToken, 
      asyncHandler(validateTenant),
      attachTenantContext,
      asyncHandler(requireRole([UserRole.ADMIN])), 
      asyncHandler(this.vendorController.delete.bind(this.vendorController))
    );

    // POST /vendors/:id/payments - Record vendor payment
    this.router.post("/vendors/:id/payments",
      authenticateToken,
      asyncHandler(validateTenant),
      attachTenantContext,
      asyncHandler(requireRole([UserRole.ADMIN, UserRole.OPERATOR])),
      asyncHandler(this.vendorController.recordPayment.bind(this.vendorController))
    );

    // GET /vendors/:id/outstanding-invoices - Get outstanding invoices
    this.router.get("/vendors/:id/outstanding-invoices",
      authenticateToken,
      asyncHandler(validateTenant),
      attachTenantContext,
      asyncHandler(this.vendorController.getOutstandingInvoices.bind(this.vendorController))
    );
  }
}