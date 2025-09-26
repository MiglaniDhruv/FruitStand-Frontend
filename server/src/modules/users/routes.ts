import { BaseRouter } from "../../utils/base";
import { UserController } from "./controller";
import { authenticateToken, requireRole } from "../../middleware/auth";
import { UserRole } from "../../types";

export class UserRouter extends BaseRouter {
  private userController: UserController;

  constructor() {
    super();
    this.userController = new UserController();
    this.setupRoutes();
  }

  private setupRoutes() {
    // GET /api/users - List users with pagination support
    this.router.get("/api/users", 
      authenticateToken, 
      requireRole([UserRole.ADMIN]), 
      this.userController.getAll.bind(this.userController)
    );

    // GET /api/users/:id - Get user by ID
    this.router.get("/api/users/:id", 
      authenticateToken, 
      requireRole([UserRole.ADMIN]), 
      this.userController.getById.bind(this.userController)
    );

    // POST /api/users - Create new user
    this.router.post("/api/users", 
      authenticateToken, 
      requireRole([UserRole.ADMIN]), 
      this.userController.create.bind(this.userController)
    );

    // PUT /api/users/:id - Update user
    this.router.put("/api/users/:id", 
      authenticateToken, 
      requireRole([UserRole.ADMIN]), 
      this.userController.update.bind(this.userController)
    );

    // DELETE /api/users/:id - Delete user
    this.router.delete("/api/users/:id", 
      authenticateToken, 
      requireRole([UserRole.ADMIN]), 
      this.userController.delete.bind(this.userController)
    );

    // PUT /api/users/:id/permissions - Update user permissions
    this.router.put("/api/users/:id/permissions", 
      authenticateToken, 
      requireRole([UserRole.ADMIN]), 
      this.userController.updatePermissions.bind(this.userController)
    );
  }
}