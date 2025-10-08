import { Request, Response } from 'express';
import { z } from 'zod';
import { BaseController } from '../../utils/base';
import { PurchaseInvoiceModel } from './model';
import { insertPurchaseInvoiceSchema, insertInvoiceItemSchema, insertCrateTransactionSchema } from '@shared/schema';
import { type AuthenticatedRequest } from '../../types';

const createPurchaseInvoiceBodySchema = z.object({
  invoice: insertPurchaseInvoiceSchema.omit({ tenantId: true }),
  items: z.array(insertInvoiceItemSchema.omit({ invoiceId: true, tenantId: true })),
  crateTransaction: z.object({
    partyType: z.enum(['retailer', 'vendor']),
    vendorId: z.string().uuid().optional(),
    retailerId: z.string().uuid().optional(),
    transactionType: z.enum(['Given', 'Received']),
    quantity: z.coerce.number(),
    transactionDate: z.union([z.string(), z.date()]).transform((val) => 
      typeof val === 'string' ? new Date(val) : val
    ),
    notes: z.string().optional(),
  }).optional(),
  stockOutEntryIds: z.array(z.string().uuid()).optional(),
});

const shareInvoiceParamsSchema = z.object({
  id: z.string().uuid('Invalid invoice ID format')
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

      const { invoice: invoiceData, items: itemsData, crateTransaction, stockOutEntryIds } = validation.data;
      
      // Add tenantId to the data before passing to model
      const invoiceWithTenant = { ...invoiceData, tenantId };
      const itemsWithTenant = itemsData.map(item => ({ ...item, tenantId }));
      const crateTransactionWithTenant = crateTransaction ? { ...crateTransaction, tenantId } : undefined;
      
      const invoice = await this.purchaseInvoiceModel.createPurchaseInvoice(
        tenantId, 
        invoiceWithTenant, 
        itemsWithTenant as any,
        crateTransactionWithTenant,
        stockOutEntryIds
      );
      
      res.status(201).json(invoice);
    } catch (error) {
      this.handleError(res, error, 'Failed to create purchase invoice');
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
      
      const shareLink = await this.purchaseInvoiceModel.createShareLink(tenantId, invoiceId);
      
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

  async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ message: 'Invoice ID is required' });
      }

      const success = await this.purchaseInvoiceModel.deletePurchaseInvoice(tenantId, id);
      
      if (!success) {
        return this.sendNotFound(res, 'Invoice not found');
      }

      res.status(204).send();
    } catch (error) {
      this.handleError(res, error, 'Failed to delete purchase invoice');
    }
  }
}