import { BaseRouter } from "../../utils/base";
import { ItemController } from "./controller";
import { authenticateToken, requireRole, validateTenant, attachTenantContext } from "../../middleware/auth";
import { UserRole } from "../../types";

export class ItemRouter extends BaseRouter {
  private itemController: ItemController;

  constructor() {
    super();
    this.itemController = new ItemController();
    this.setupRoutes();
  }

  private setupRoutes() {
    // GET /items - List items with pagination support
    this.router.get("/items", 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.itemController.getAll.bind(this.itemController)
    );

    // GET /items/vendor/:vendorId - Get items by vendor
    this.router.get("/items/vendor/:vendorId", 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.itemController.getByVendor.bind(this.itemController)
    );

    // GET /items/:id - Get item by ID
    this.router.get("/items/:id", 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.itemController.getById.bind(this.itemController)
    );

    // POST /items - Create new item
    this.router.post("/items", 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      requireRole([UserRole.ADMIN, UserRole.OPERATOR]), 
      this.itemController.create.bind(this.itemController)
    );

    // PUT /items/:id - Update item
    this.router.put("/items/:id", 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      requireRole([UserRole.ADMIN, UserRole.OPERATOR]), 
      this.itemController.update.bind(this.itemController)
    );

    // DELETE /items/:id - Delete item (Admin only)
    this.router.delete("/items/:id", 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      requireRole([UserRole.ADMIN]), 
      this.itemController.delete.bind(this.itemController)
    );
  }
}