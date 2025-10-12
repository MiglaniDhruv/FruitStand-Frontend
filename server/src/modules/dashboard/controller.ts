import { Request, Response } from 'express';
import { BaseController } from '../../utils/base';
import { DashboardModel } from './model';
import { type AuthenticatedRequest, ForbiddenError } from '../../types';

export class DashboardController extends BaseController {
  private dashboardModel: DashboardModel;

  constructor() {
    super();
    this.dashboardModel = new DashboardModel();
  }

  /**
   * Get dashboard KPIs for a tenant
   * 
   * API SHAPE CHANGE: This endpoint now returns comprehensive dashboard data including:
   * - 7 currency-formatted strings (cash, bank, sales, purchases, udhaar, shortfall, commission)
   * - 3 arrays (recentPurchases, recentSales, topRetailersByUdhaar)
   * 
   * Ensure UI components are updated to handle the new response structure before deployment.
   */
  async getKPIs(req: AuthenticatedRequest, res: Response) {
    if (!req.tenantId) throw new ForbiddenError('No tenant context found');
    const tenantId = req.tenantId;
    
    const kpis = await this.dashboardModel.getDashboardKPIs(tenantId);
    res.json(kpis);
  }
}