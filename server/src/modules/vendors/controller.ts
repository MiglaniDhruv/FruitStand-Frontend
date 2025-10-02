import { Request, Response } from "express";
import { z } from "zod";
import { BaseController } from "../../utils/base";
import { VendorModel } from "./model";
import { AuthenticatedRequest } from "../../types";
import { insertVendorSchema } from "@shared/schema";

export class VendorController extends BaseController {
  private vendorModel: VendorModel;

  constructor() {
    super();
    this.vendorModel = new VendorModel();
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
        const vendors = await this.vendorModel.getVendors(tenantId);
        res.json(vendors);
        return;
      }

      // Use base controller utilities for pagination parsing
      const opts = {
        ...this.getPaginationOptions(req.query),
        status: req.query.status as string | undefined
      };
      
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
      const validSortFields = ['name', 'contactPerson', 'createdAt'];
      if (opts.sortBy && !validSortFields.includes(opts.sortBy)) {
        return res.status(400).json({ message: "Invalid sortBy field" });
      }
      
      const result = await this.vendorModel.getVendorsPaginated(tenantId, opts);
      
      res.json(result);
    } catch (error) {
      return this.handleError(res, error, "Failed to fetch vendors");
    }
  }

  async getById(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.tenantId) return res.status(403).json({ message: 'No tenant context found' });
      const tenantId = req.tenantId;
      const vendor = await this.vendorModel.getVendor(tenantId, req.params.id);
      if (!vendor) {
        return this.sendNotFound(res, "Vendor not found");
      }
      
      res.json(vendor);
    } catch (error) {
      return this.handleError(res, error, "Failed to fetch vendor");
    }
  }

  async create(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.tenantId) return res.status(403).json({ message: 'No tenant context found' });
      const tenantId = req.tenantId;
      const vendorData = insertVendorSchema.parse(req.body);
      const vendor = await this.vendorModel.createVendor(tenantId, vendorData);
      
      res.status(201).json(vendor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return this.sendValidationError(res, error.errors);
      }
      return this.handleError(res, error, "Failed to create vendor");
    }
  }

  async update(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.tenantId) return res.status(403).json({ message: 'No tenant context found' });
      const tenantId = req.tenantId;
      const vendorData = insertVendorSchema.partial().parse(req.body);
      const vendor = await this.vendorModel.updateVendor(tenantId, req.params.id, vendorData);
      
      if (!vendor) {
        return this.sendNotFound(res, "Vendor not found");
      }
      
      res.json(vendor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return this.sendValidationError(res, error.errors);
      }
      return this.handleError(res, error, "Failed to update vendor");
    }
  }

  async delete(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.tenantId) return res.status(403).json({ message: 'No tenant context found' });
      const tenantId = req.tenantId;
      const success = await this.vendorModel.deleteVendor(tenantId, req.params.id);
      if (!success) {
        return this.sendNotFound(res, "Vendor not found");
      }
      res.json({ message: "Vendor deleted successfully" });
    } catch (error) {
      return this.handleError(res, error, "Failed to delete vendor");
    }
  }
}