import { Request, Response } from "express";
import { z } from "zod";
import { BaseController } from "../../utils/base";
import { VendorModel } from "./model";
import { PaymentModel } from "../payments/model";
import { AuthenticatedRequest } from "../../types";
import { insertVendorSchema, insertVendorPaymentSchema } from "@shared/schema";
import { whatsAppService } from "../../services/whatsapp";

export class VendorController extends BaseController {
  private vendorModel: VendorModel;
  private paymentModel: PaymentModel;

  constructor() {
    super();
    this.vendorModel = new VendorModel();
    this.paymentModel = new PaymentModel();
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
      const vendorData = insertVendorSchema.parse({ ...req.body, tenantId });
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
      const vendorData = insertVendorSchema.partial().parse({ ...req.body, tenantId });
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

  async recordPayment(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.tenantId) return res.status(403).json({ message: 'No tenant context found' });
      const tenantId = req.tenantId;
      const vendorId = req.params.id;

      const validation = insertVendorPaymentSchema.safeParse(req.body);
      if (!validation.success) {
        return this.sendValidationError(res, validation.error.issues);
      }

      const result = await this.paymentModel.recordVendorPayment(tenantId, vendorId, validation.data);

      // Send WhatsApp notifications for each created payment
      for (const payment of result.paymentsCreated) {
        try {
          await whatsAppService.sendPaymentNotification(tenantId, payment.id, 'purchase');
        } catch (error) {
          console.error('WhatsApp notification failed:', error);
        }
      }

      res.status(201).json(result);
    } catch (error) {
      return this.handleError(res, error, "Failed to record vendor payment");
    }
  }

  async getOutstandingInvoices(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.tenantId) return res.status(403).json({ message: 'No tenant context found' });
      const tenantId = req.tenantId;
      const vendorId = req.params.id;

      if (!z.string().uuid().safeParse(vendorId).success) {
        return res.status(400).json({ message: 'Invalid vendor ID' });
      }

      const invoices = await this.paymentModel.getOutstandingInvoicesForVendor(tenantId, vendorId);
      res.json(invoices);
    } catch (error) {
      return this.handleError(res, error, "Failed to fetch outstanding invoices");
    }
  }
}