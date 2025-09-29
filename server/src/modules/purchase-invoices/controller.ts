import { Request, Response } from 'express';
import { z } from 'zod';
import { BaseController } from '../../utils/base';
import { PurchaseInvoiceModel } from './model';
import { insertPurchaseInvoiceSchema, insertInvoiceItemSchema } from '@shared/schema';
import { type AuthenticatedRequest } from '../../types';

const createPurchaseInvoiceBodySchema = z.object({
  invoice: insertPurchaseInvoiceSchema,
  items: z.array(insertInvoiceItemSchema.omit({ invoiceId: true }))
});

export class PurchaseInvoiceController extends BaseController {
  private purchaseInvoiceModel: PurchaseInvoiceModel;

  constructor() {
    super();
    this.purchaseInvoiceModel = new PurchaseInvoiceModel();
  }

  async getAll(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      
      const { 
        page, 
        limit, 
        search, 
        sortBy, 
        sortOrder,
        status,
        vendorId,
        dateFrom,
        dateTo,
        paginated
      } = req.query;

      // Validate sortBy parameter
      const validSortFields = ['invoiceDate', 'invoiceNumber', 'totalAmount', 'status', 'createdAt'];
      const sortByValue = typeof sortBy === 'string' && validSortFields.includes(sortBy) ? sortBy : 'createdAt';
      const sortOrderValue = sortOrder === 'asc' ? 'asc' : 'desc';

      // Check if pagination is requested using the paginated flag
      const doPaginate = paginated === 'true';

      if (doPaginate) {
        // Return paginated response
        const options = {
          page: page ? parseInt(page as string, 10) : 1,
          limit: limit ? parseInt(limit as string, 10) : 10,
          search: search as string,
          sortBy: sortByValue,
          sortOrder: sortOrderValue as 'asc' | 'desc',
          status: status as 'paid' | 'unpaid' | undefined,
          vendorId: vendorId as string,
          dateRange: {
            from: dateFrom as string,
            to: dateTo as string
          }
        };

        const result = await this.purchaseInvoiceModel.getPurchaseInvoicesPaginated(tenantId, options);
        return res.json({ data: result.data, pagination: result.pagination });
      } else {
        // Return non-paginated response for backward compatibility
        const invoices = await this.purchaseInvoiceModel.getPurchaseInvoices(tenantId);
        res.json(invoices);
      }
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch purchase invoices');
    }
  }

  async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ message: 'Invoice ID is required' });
      }

      const invoice = await this.purchaseInvoiceModel.getPurchaseInvoice(tenantId, id);
      
      if (!invoice) {
        return this.sendNotFound(res, 'Invoice not found');
      }

      res.json(invoice);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch purchase invoice');
    }
  }

  async create(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      
      const validation = createPurchaseInvoiceBodySchema.safeParse(req.body);
      
      if (!validation.success) {
        return this.sendValidationError(res, validation.error.errors);
      }

      const { invoice: invoiceData, items: itemsData } = validation.data;
      
      const invoice = await this.purchaseInvoiceModel.createPurchaseInvoice(tenantId, invoiceData, itemsData as any);
      
      res.status(201).json(invoice);
    } catch (error) {
      this.handleError(res, error, 'Failed to create purchase invoice');
    }
  }
}