import { Request, Response } from "express";
import { z } from "zod";
import { BaseController } from "../../utils/base";
import { ItemModel } from "./model";
import { AuthenticatedRequest } from "../../types";
import { insertItemSchema } from "@shared/schema";

export class ItemController extends BaseController {
  private itemModel: ItemModel;

  constructor() {
    super();
    this.itemModel = new ItemModel();
  }

  // Override to maintain legacy validation error message format
  protected sendValidationError(res: Response, errors: any) {
    return res.status(400).json({
      message: "Validation error",
      errors
    });
  }

  async getAll(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.tenantId) return res.status(403).json({ message: 'No tenant context found' });
      const tenantId = req.tenantId;
      
      // Check if pagination is requested
      const isPaginated = req.query.page || req.query.limit || req.query.paginated === 'true';
      
      if (!isPaginated) {
        // Return original array response for backward compatibility
        const items = await this.itemModel.getItems(tenantId);
        res.json(items);
        return;
      }

      // Use base controller utilities for pagination parsing
      const opts = this.getPaginationOptions(req.query);
      
      // Override default sort to preserve legacy behavior (name instead of createdAt)
      if (!req.query.sortBy) {
        opts.sortBy = 'name';
      }
      
      // Validate pagination parameters (with defaults from getPaginationOptions)
      const page = opts.page || 1;
      const limit = opts.limit || 10;
      
      if (page < 1) {
        return res.status(400).json({ message: "Page must be >= 1" });
      }
      
      if (limit < 1 || limit > 100) {
        return res.status(400).json({ message: "Limit must be between 1 and 100" });
      }
      
      // Validate sortBy if provided
      const validSortFields = ['name', 'quality', 'unit', 'createdAt'];
      if (opts.sortBy && !validSortFields.includes(opts.sortBy)) {
        return res.status(400).json({ message: "Invalid sortBy field" });
      }
      
      const result = await this.itemModel.getItemsPaginated(tenantId, opts);
      
      res.json(result);
    } catch (error) {
      return this.handleError(res, error, "Failed to fetch items");
    }
  }

  async getByVendor(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      
      // Validate vendorId parameter
      const vendorIdValidation = z.string().uuid().safeParse(req.params.vendorId);
      if (!vendorIdValidation.success) {
        return this.sendValidationError(res, vendorIdValidation.error.errors);
      }
      
      const vendorId = vendorIdValidation.data;
      const items = await this.itemModel.getItemsByVendor(tenantId, vendorId);
      res.json(items);
    } catch (error) {
      return this.handleError(res, error, "Failed to fetch items by vendor");
    }
  }

  async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      
      // Validate id parameter
      const idValidation = z.string().uuid().safeParse(req.params.id);
      if (!idValidation.success) {
        return this.sendValidationError(res, idValidation.error.errors);
      }
      
      const item = await this.itemModel.getItem(tenantId, idValidation.data);
      if (!item) {
        return this.sendNotFound(res, "Item not found");
      }
      
      res.json(item);
    } catch (error) {
      return this.handleError(res, error, "Failed to fetch item");
    }
  }

  async create(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const itemData = insertItemSchema.parse(req.body);
      const item = await this.itemModel.createItem(tenantId, itemData);
      
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return this.sendValidationError(res, error.errors);
      }
      return this.handleError(res, error, "Failed to create item");
    }
  }

  async update(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      
      // Validate id parameter
      const idValidation = z.string().uuid().safeParse(req.params.id);
      if (!idValidation.success) {
        return this.sendValidationError(res, idValidation.error.errors);
      }
      
      const itemData = insertItemSchema.partial().parse(req.body);
      const item = await this.itemModel.updateItem(tenantId, idValidation.data, itemData);
      
      if (!item) {
        return this.sendNotFound(res, "Item not found");
      }
      
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return this.sendValidationError(res, error.errors);
      }
      return this.handleError(res, error, "Failed to update item");
    }
  }

  async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      
      // Validate id parameter
      const idValidation = z.string().uuid().safeParse(req.params.id);
      if (!idValidation.success) {
        return this.sendValidationError(res, idValidation.error.errors);
      }
      
      const result = await this.itemModel.deleteItem(tenantId, idValidation.data);
      if (!result.success) {
        if (result.error) {
          return res.status(400).json({ message: result.error });
        }
        return this.sendNotFound(res, "Item not found");
      }
      res.json({ message: "Item deleted successfully" });
    } catch (error) {
      return this.handleError(res, error, "Failed to delete item");
    }
  }
}