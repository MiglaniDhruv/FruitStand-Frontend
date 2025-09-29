import { BaseRouter } from "../../utils/base";
import { AuthController } from "./controller";
import { authenticateToken } from "../../middleware/auth";

export class AuthRouter extends BaseRouter {
  private authController: AuthController;

  constructor() {
    super();
    this.authController = new AuthController();
    this.setupRoutes();
  }

  private setupRoutes() {
    // POST /auth/login - User authentication
    this.router.post("/auth/login", 
      this.authController.login.bind(this.authController)
    );

    // POST /auth/logout - User logout
    this.router.post("/auth/logout", 
      this.authController.logout.bind(this.authController)
    );

    // GET /auth/me - Get current authenticated user
    this.router.get("/auth/me", 
      authenticateToken,
      this.authController.getCurrentUser.bind(this.authController)
    );

    // POST /auth/refresh - Refresh JWT token (no auth required - uses refresh token from cookie)
    this.router.post("/auth/refresh", 
      this.authController.refreshToken.bind(this.authController)
    );

    // POST /auth/switch-tenant - Switch user's tenant context
    this.router.post("/auth/switch-tenant", 
      authenticateToken,
      this.authController.switchTenant.bind(this.authController)
    );
  }
}