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

  async getKPIs(req: AuthenticatedRequest, res: Response) {
    if (!req.tenantId) throw new ForbiddenError('No tenant context found');
    const tenantId = req.tenantId;
    
    const kpis = await this.dashboardModel.getDashboardKPIs(tenantId);
    res.json(kpis);
  }
}