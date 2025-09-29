import { Request, Response } from 'express';
import { BaseController } from '../../utils/base';
import { DashboardModel } from './model';
import { type AuthenticatedRequest } from '../../types';

export class DashboardController extends BaseController {
  private dashboardModel: DashboardModel;

  constructor() {
    super();
    this.dashboardModel = new DashboardModel();
  }

  async getKPIs(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const kpis = await this.dashboardModel.getDashboardKPIs(tenantId);
      res.json(kpis);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch dashboard KPIs');
    }
  }
}