import { BaseRouter } from "../../utils/base";
import { UserController } from "./controller";
import { authenticateToken, requirePermission, validateTenant, attachTenantContext } from "../../middleware/auth";

export class UserRouter extends BaseRouter {
  private userController: UserController;

  constructor() {
    super();
    this.userController = new UserController();
    this.setupRoutes();
  }

  private setupRoutes() {
    // GET /users - List users with pagination support
    this.router.get("/users", 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      requirePermission(['view_users', 'manage_users']), 
      this.userController.getAll.bind(this.userController)
    );

    // GET /users/:id - Get user by ID
    this.router.get("/users/:id", 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      requirePermission(['view_users', 'manage_users']), 
      this.userController.getById.bind(this.userController)
    );

    // POST /users - Create new user
    this.router.post("/users", 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      requirePermission(['manage_users']), 
      this.userController.create.bind(this.userController)
    );

    // PUT /users/:id - Update user
    this.router.put("/users/:id", 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      requirePermission(['manage_users']), 
      this.userController.update.bind(this.userController)
    );

    // DELETE /users/:id - Delete user
    this.router.delete("/users/:id", 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      requirePermission(['manage_users']), 
      this.userController.delete.bind(this.userController)
    );

    // PUT /users/:id/permissions - Update user permissions
    this.router.put("/users/:id/permissions", 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      requirePermission(['manage_users']), 
      this.userController.updatePermissions.bind(this.userController)
    );
  }
}