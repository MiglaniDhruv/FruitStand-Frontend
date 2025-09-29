import { Request, Response } from "express";
import { z } from "zod";
import { BaseController } from "../../utils/base";
import { StockModel } from "./model";
import { AuthenticatedRequest } from "../../types";
import { insertStockSchema, insertStockMovementSchema } from "@shared/schema";

export class StockController extends BaseController {
  private stockModel: StockModel;

  constructor() {
    super();
    this.stockModel = new StockModel();
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
      const tenantId = req.tenantId!;
      
      // Check if pagination is requested (match legacy behavior)
      const isPaginated = req.query.paginated === 'true';
      
      if (!isPaginated) {
        // Return original array response for backward compatibility
        const stock = await this.stockModel.getStock(tenantId);
        res.json(stock);
        return;
      }

      // Use base controller utilities for pagination parsing
      const opts = this.getPaginationOptions(req.query);
      
      // Override default sort to preserve legacy behavior (lastUpdated instead of createdAt)
      if (!req.query.sortBy) {
        opts.sortBy = 'lastUpdated';
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
      const validSortFields = ['itemName', 'vendorName', 'quantityInCrates', 'quantityInBoxes', 'quantityInKgs', 'lastUpdated'];
      if (opts.sortBy && !validSortFields.includes(opts.sortBy)) {
        return res.status(400).json({ message: "Invalid sortBy field" });
      }
      
      // Add special filters for stock
      const stockOptions = {
        ...opts,
        search: req.query.search as string,
        lowStock: req.query.lowStock === 'true'
      };
      
      const result = await this.stockModel.getStockPaginated(tenantId, stockOptions);
      
      // Match legacy response format
      res.json({ data: result.data, pagination: result.pagination });
    } catch (error) {
      return this.handleError(res, error, "Failed to fetch stock");
    }
  }

  async updateStock(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      
      // Validate itemId parameter
      const idValidation = z.string().uuid().safeParse(req.params.itemId);
      if (!idValidation.success) {
        return this.sendValidationError(res, idValidation.error.errors);
      }
      
      const stockData = insertStockSchema.partial().parse(req.body);
      const stock = await this.stockModel.updateStock(tenantId, idValidation.data, stockData);
      
      res.json(stock);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return this.sendValidationError(res, error.errors);
      }
      return this.handleError(res, error, "Failed to update stock");
    }
  }

  async getMovements(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const movements = await this.stockModel.getStockMovements(tenantId);
      res.json(movements);
    } catch (error) {
      return this.handleError(res, error, "Failed to fetch stock movements");
    }
  }

  async getMovementsByItem(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      
      // Validate itemId parameter
      const idValidation = z.string().uuid().safeParse(req.params.itemId);
      if (!idValidation.success) {
        return this.sendValidationError(res, idValidation.error.errors);
      }
      
      const movements = await this.stockModel.getStockMovementsByItem(tenantId, idValidation.data);
      res.json(movements);
    } catch (error) {
      return this.handleError(res, error, "Failed to fetch stock movements by item");
    }
  }

  async getAvailableOutEntriesByVendor(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      
      // Validate vendorId parameter
      const idValidation = z.string().uuid().safeParse(req.params.vendorId);
      if (!idValidation.success) {
        return this.sendValidationError(res, idValidation.error.errors);
      }
      
      const entries = await this.stockModel.getAvailableStockOutEntriesByVendor(tenantId, idValidation.data);
      res.json(entries);
    } catch (error) {
      return this.handleError(res, error, "Failed to fetch available stock out entries");
    }
  }

  async createMovement(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      
      const movementData = insertStockMovementSchema.parse(req.body);
      const movement = await this.stockModel.createStockMovement(tenantId, movementData);
      
      res.status(201).json(movement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return this.sendValidationError(res, error.errors);
      }
      return this.handleError(res, error, "Failed to create stock movement");
    }
  }

  async calculateBalance(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      
      // Validate itemId parameter
      const idValidation = z.string().uuid().safeParse(req.params.itemId);
      if (!idValidation.success) {
        return this.sendValidationError(res, idValidation.error.errors);
      }
      
      const balance = await this.stockModel.calculateStockBalance(tenantId, idValidation.data);
      res.json(balance);
    } catch (error) {
      return this.handleError(res, error, "Failed to calculate stock balance");
    }
  }
}