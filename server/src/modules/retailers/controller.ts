import { Request, Response } from 'express';
import { BaseController } from '../../utils/base';
import { RetailerModel } from './model';
import { insertRetailerSchema } from '@shared/schema';
import { type AuthenticatedRequest } from '../../types';

export class RetailerController extends BaseController {
  private retailerModel: RetailerModel;

  constructor() {
    super();
    this.retailerModel = new RetailerModel();
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
        paginated
      } = req.query;

      // Validate sortBy parameter
      const validSortFields = ['name', 'phone', 'createdAt'];
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
          status: status as string
        };

        const result = await this.retailerModel.getRetailersPaginated(tenantId, options);
        return res.json({ data: result.data, pagination: result.pagination });
      } else {
        // Return non-paginated response for backward compatibility
        const retailers = await this.retailerModel.getRetailers(tenantId);
        res.json(retailers);
      }
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch retailers');
    }
  }

  async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ message: 'Retailer ID is required' });
      }

      const retailer = await this.retailerModel.getRetailer(tenantId, id);
      
      if (!retailer) {
        return this.sendNotFound(res, 'Retailer not found');
      }

      res.json(retailer);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch retailer');
    }
  }

  async create(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      
      const validation = insertRetailerSchema.safeParse(req.body);
      
      if (!validation.success) {
        return this.sendValidationError(res, validation.error.errors);
      }

      const retailerData = validation.data;
      
      const retailer = await this.retailerModel.createRetailer(tenantId, retailerData);
      
      res.status(201).json(retailer);
    } catch (error) {
      this.handleError(res, error, 'Failed to create retailer');
    }
  }

  async update(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ message: 'Retailer ID is required' });
      }

      const validation = insertRetailerSchema.partial().safeParse(req.body);
      
      if (!validation.success) {
        return this.sendValidationError(res, validation.error.errors);
      }

      const retailerData = validation.data;
      
      const retailer = await this.retailerModel.updateRetailer(tenantId, id, retailerData);
      
      if (!retailer) {
        return this.sendNotFound(res, 'Retailer not found');
      }

      res.json(retailer);
    } catch (error) {
      this.handleError(res, error, 'Failed to update retailer');
    }
  }

  async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ message: 'Retailer ID is required' });
      }

      const success = await this.retailerModel.deleteRetailer(tenantId, id);
      
      if (!success) {
        return this.sendNotFound(res, 'Retailer not found');
      }

            return res.status(204).send();
    } catch (error) {
      this.handleError(res, error, 'Failed to delete retailer');
    }
  }
}