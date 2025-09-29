import { Request, Response } from 'express';
import { insertSalesPaymentSchema } from '@shared/schema';
import { BaseController } from '../../utils/base';
import { SalesPaymentModel } from './model';
import { type AuthenticatedRequest } from '../../types';

export class SalesPaymentController extends BaseController {
  private salesPaymentModel: SalesPaymentModel;

  constructor() {
    super();
    this.salesPaymentModel = new SalesPaymentModel();
  }

  async getSalesPayments(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const includeDetails = req.query.includeDetails === 'true';
      const salesPayments = await this.salesPaymentModel.getSalesPayments(tenantId, includeDetails);
      res.json(salesPayments);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch sales payments');
    }
  }

  async getSalesPaymentsByInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { invoiceId } = req.params;
      
      if (!invoiceId) {
        return res.status(400).json({ message: 'Invoice ID is required' });
      }

      const includeDetails = req.query.includeDetails === 'true';
      const salesPayments = await this.salesPaymentModel.getSalesPaymentsByInvoice(tenantId, invoiceId, includeDetails);
      res.json(salesPayments);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch sales payments for invoice');
    }
  }

  async createSalesPayment(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      
      const validation = insertSalesPaymentSchema.safeParse(req.body);
      
      if (!validation.success) {
        return this.sendValidationError(res, validation.error.errors);
      }

      const paymentData = validation.data;
      
      const salesPayment = await this.salesPaymentModel.createSalesPayment(tenantId, paymentData);
      
      res.status(201).json(salesPayment);
    } catch (error) {
      this.handleError(res, error, 'Failed to create sales payment');
    }
  }
}