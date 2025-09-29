import { Router } from "express";
import { BaseRouter } from "../../utils/base";
import { TenantController } from "./controller";
import { authenticateToken, requirePermission, validateTenant, attachTenantContext } from "../../middleware/auth";

export class TenantRouter extends BaseRouter {
  private tenantController: TenantController;

  constructor() {
    super();
    this.tenantController = new TenantController();
    this.setupRoutes();
  }

  protected setupRoutes(): void {
    // GET /tenants/slug/:slug - Public endpoint for tenant validation by slug
    this.router.get('/tenants/slug/:slug',
      this.tenantController.getBySlug.bind(this.tenantController)
    );

    // GET /tenants/current - Get current user's tenant
    this.router.get('/tenants/current', 
      authenticateToken, 
      this.tenantController.getCurrent.bind(this.tenantController)
    );

    // GET /tenants/accessible - Get tenants accessible to current user
    this.router.get('/tenants/accessible', 
      authenticateToken, 
      this.tenantController.getAccessible.bind(this.tenantController)
    );

    // GET /tenants/current/settings - Get current tenant's settings
    this.router.get('/tenants/current/settings', 
      authenticateToken,
      validateTenant,
      attachTenantContext,
      this.tenantController.getSettings.bind(this.tenantController)
    );

    // PUT /tenants/current/settings - Update current tenant's settings
    this.router.put('/tenants/current/settings', 
      authenticateToken,
      validateTenant,
      attachTenantContext,
      requirePermission(['manage_settings']),
      this.tenantController.updateSettings.bind(this.tenantController)
    );
  }
}