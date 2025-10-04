import { Request, Response } from 'express';
import { z } from 'zod';
import { insertCrateTransactionSchema } from '@shared/schema';
import { BaseController } from '../../utils/base';
import { CrateModel } from './model';
import { type AuthenticatedRequest } from '../../types';

const crateValidation = {
  getCrateTransactionsPaginated: z.object({
    page: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
    limit: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
    search: z.string().optional(),
    type: z.enum(['given', 'received', 'returned']).optional(),
    partyType: z.enum(['retailer', 'vendor']).optional(),
    retailerId: z.string().uuid().optional(),
    vendorId: z.string().uuid().optional(),
    dateFrom: z.string().optional().refine(val => {
      if (!val) return true;
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, 'Invalid date format for dateFrom'),
    dateTo: z.string().optional().refine(val => {
      if (!val) return true;
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, 'Invalid date format for dateTo'),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    paginated: z.string().optional()
  })
};

export class CrateController extends BaseController {
  private crateModel: CrateModel;

  constructor() {
    super();
    this.crateModel = new CrateModel();
  }

  async getAll(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      
      const validation = crateValidation.getCrateTransactionsPaginated.safeParse(req.query);
      
      if (!validation.success) {
        return this.sendValidationError(res, validation.error.errors);
      }

      const options = validation.data;
      
      // Check if this should return all transactions or paginated
      if (options.paginated !== 'true') {
        const allTransactions = await this.crateModel.getCrateTransactions(tenantId);
        return res.json(allTransactions);
      }
      
      const result = await this.crateModel.getCrateTransactionsPaginated(tenantId, options);
      
      return res.json({ data: result.data, pagination: result.pagination });
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch crate transactions');
    }
  }

  async getByRetailer(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { retailerId } = req.params;
      
      if (!retailerId) {
        return res.status(400).json({ message: 'Retailer ID is required' });
      }

      const transactions = await this.crateModel.getCrateTransactionsByRetailer(tenantId, retailerId);
      // Strip retailer and vendor fields to match original response format
      const responseTransactions = transactions.map(({ retailer, vendor, ...tx }) => tx);
      res.json(responseTransactions);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch crate transactions for retailer');
    }
  }

  async getByVendor(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { vendorId } = req.params;
      
      if (!vendorId) {
        return res.status(400).json({ message: 'Vendor ID is required' });
      }

      const transactions = await this.crateModel.getCrateTransactionsByVendor(tenantId, vendorId);
      // Strip retailer and vendor fields to match original response format
      const responseTransactions = transactions.map(({ retailer, vendor, ...tx }) => tx);
      res.json(responseTransactions);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch crate transactions for vendor');
    }
  }

  async create(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      
      const validation = insertCrateTransactionSchema.safeParse(req.body);
      
      if (!validation.success) {
        return this.sendValidationError(res, validation.error.errors);
      }

      const transactionData = validation.data;
      
      const transaction = await this.crateModel.createCrateTransaction(tenantId, transactionData);
      
      // Strip retailer and vendor fields to match original response format
      const { retailer, vendor, ...responseTx } = transaction;
      res.status(201).json(responseTx);
    } catch (error) {
      this.handleError(res, error, 'Failed to create crate transaction');
    }
  }
}