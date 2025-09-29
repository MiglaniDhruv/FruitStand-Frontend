import { BaseRouter } from '../../utils/base';
import { DashboardController } from './controller';
import { authenticateToken, validateTenant, attachTenantContext } from '../../middleware/auth';

export class DashboardRouter extends BaseRouter {
  private dashboardController: DashboardController;

  constructor() {
    super();
    this.dashboardController = new DashboardController();
    this.setupRoutes();
  }

  private setupRoutes() {
    // GET /dashboard/kpis - Get dashboard KPIs
    this.router.get('/dashboard/kpis', 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.dashboardController.getKPIs.bind(this.dashboardController)
    );
  }
}