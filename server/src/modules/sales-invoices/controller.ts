import { Request, Response } from 'express';
import { z } from 'zod';
import { insertSalesInvoiceSchema, insertSalesInvoiceItemSchema } from '@shared/schema';
import { BaseController } from '../../utils/base';
import { SalesInvoiceModel } from './model';
import { type AuthenticatedRequest } from '../../types';

const salesInvoiceValidation = {
  createSalesInvoice: z.object({
    invoice: insertSalesInvoiceSchema,
    items: z.array(insertSalesInvoiceItemSchema).min(1)
  }),
  getSalesInvoicesPaginated: z.object({
    page: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
    limit: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
    search: z.string().optional(),
    status: z.enum(['paid', 'unpaid']).optional(),
    retailerId: z.string().uuid().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    dateRange: z.object({
      from: z.string().optional(),
      to: z.string().optional()
    }).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    paginated: z.string().optional()
  })
};

const shareInvoiceParamsSchema = z.object({
  id: z.string().uuid('Invalid invoice ID format')
});

export class SalesInvoiceController extends BaseController {
  private salesInvoiceModel: SalesInvoiceModel;

  constructor() {
    super();
    this.salesInvoiceModel = new SalesInvoiceModel();
  }

  async getSalesInvoices(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const salesInvoices = await this.salesInvoiceModel.getSalesInvoices(tenantId);
      res.json(salesInvoices);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch sales invoices');
    }
  }

  async getSalesInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ message: 'Sales invoice ID is required' });
      }

      const salesInvoice = await this.salesInvoiceModel.getSalesInvoice(tenantId, id);
      
      if (!salesInvoice) {
        return this.sendNotFound(res, 'Sales invoice not found');
      }

      res.json(salesInvoice);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch sales invoice');
    }
  }

  async createSalesInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      
      const validation = salesInvoiceValidation.createSalesInvoice.safeParse(req.body);
      
      if (!validation.success) {
        return this.sendValidationError(res, validation.error.errors);
      }

      const { invoice, items } = validation.data;
      
      const newSalesInvoice = await this.salesInvoiceModel.createSalesInvoice(tenantId, invoice, items);
      
      res.status(201).json(newSalesInvoice);
    } catch (error) {
      this.handleError(res, error, 'Failed to create sales invoice');
    }
  }

  async markSalesInvoiceAsPaid(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ message: 'Sales invoice ID is required' });
      }

      const result = await this.salesInvoiceModel.markSalesInvoiceAsPaid(tenantId, id);
      
      res.json(result);
    } catch (error) {
      this.handleError(res, error, 'Failed to mark sales invoice as paid');
    }
  }

  async getSalesInvoicesPaginated(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      
      const validation = salesInvoiceValidation.getSalesInvoicesPaginated.safeParse(req.query);
      
      if (!validation.success) {
        return this.sendValidationError(res, validation.error.errors);
      }

      const { dateFrom, dateTo, ...restOptions } = validation.data;
      
      // Map legacy dateFrom/dateTo to dateRange
      const options = {
        ...restOptions,
        dateRange: (dateFrom || dateTo) ? {
          from: dateFrom,
          to: dateTo
        } : restOptions.dateRange
      };
      
      // Check if this should return all invoices or paginated
      if (options.paginated === 'false' || (!options.page && !options.limit && !options.paginated)) {
        const allInvoices = await this.salesInvoiceModel.getSalesInvoices(tenantId);
        return res.json(allInvoices);
      }
      
      const result = await this.salesInvoiceModel.getSalesInvoicesPaginated(tenantId, options);
      
      return res.json({ data: result.data, pagination: result.pagination });
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch paginated sales invoices');
    }
  }

  async createShareLink(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      
      const validation = shareInvoiceParamsSchema.safeParse(req.params);
      
      if (!validation.success) {
        return this.sendValidationError(res, validation.error.errors);
      }

      const { id: invoiceId } = validation.data;
      
      const shareLink = await this.salesInvoiceModel.createShareLink(tenantId, invoiceId);
      
      res.status(201).json({
        success: true,
        data: {
          shareLink,
          publicUrl: `${req.protocol}://${req.get('host')}/api/public/invoices/${shareLink.token}`
        }
      });
    } catch (error) {
      this.handleError(res, error, 'Failed to create share link');
    }
  }
}