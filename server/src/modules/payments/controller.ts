import { Request, Response } from 'express';
import { BaseController } from '../../utils/base';
import { PaymentModel } from './model';
import { insertPaymentSchema } from '@shared/schema';
import { type AuthenticatedRequest } from '../../types';

export class PaymentController extends BaseController {
  private paymentModel: PaymentModel;

  constructor() {
    super();
    this.paymentModel = new PaymentModel();
  }

  async getAll(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const payments = await this.paymentModel.getPayments(tenantId);
      res.json(payments);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch payments');
    }
  }

  async getByInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { invoiceId } = req.params;
      
      if (!invoiceId) {
        return res.status(400).json({ message: 'Invoice ID is required' });
      }

      const payments = await this.paymentModel.getPaymentsByInvoice(tenantId, invoiceId);
      res.json(payments);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch payments for invoice');
    }
  }

  async create(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      
      const validation = insertPaymentSchema.safeParse(req.body);
      
      if (!validation.success) {
        return this.sendValidationError(res, validation.error.errors);
      }

      const paymentData = validation.data;
      
      const payment = await this.paymentModel.createPayment(tenantId, paymentData);
      
      res.status(201).json(payment);
    } catch (error) {
      this.handleError(res, error, 'Failed to create payment');
    }
  }
}