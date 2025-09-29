import { Request, Response } from "express";
import { z } from "zod";
import { TenantModel } from "./model";
import { insertTenantSchema, tenantSettingsSchema } from "@shared/schema";
import { BaseController } from "../../utils/base";
import { AuthenticatedRequest } from "../../types";

export class TenantController extends BaseController {
  constructor() {
    super();
  }

  /**
   * Get current user's tenant
   */
  async getCurrent(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user?.tenantId) {
        return res.status(403).json({ 
          message: "No tenant context found",
          code: "NO_TENANT_CONTEXT"
        });
      }

      const tenant = await TenantModel.getTenant(req.user.tenantId);
      
      if (!tenant) {
        return res.status(404).json({ 
          message: 'Tenant not found',
          code: "TENANT_NOT_FOUND"
        });
      }
      
      // Always return 200 with full tenant payload, including isActive status
      // Let client handle inactive tenant logic
      return res.status(200).json(tenant);
    } catch (error) {
      return this.handleError(res, error, "Failed to fetch current tenant");
    }
  }

  /**
   * Get tenants accessible to current user
   * Only return current tenant for tenant-only system
   */
  async getAccessible(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user?.tenantId) {
        return res.status(403).json({ 
          message: "No tenant context found",
          code: "NO_TENANT_CONTEXT"
        });
      }

      // Only return current tenant in tenant-only system
      const currentTenant = await TenantModel.getTenant(req.user.tenantId);
      if (!currentTenant) {
        return res.json([]);
      }

      return res.json([{
        id: currentTenant.id,
        name: currentTenant.name,
        slug: currentTenant.slug,
        isActive: currentTenant.isActive,
        role: req.user.role
      }]);
    } catch (error) {
      return this.handleError(res, error, "Failed to fetch accessible tenants");
    }
  }

  /**
   * Get current tenant's settings
   */
  async getSettings(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(403).json({ 
          message: "No tenant context found",
          code: "NO_TENANT_CONTEXT"
        });
      }

      const settings = await TenantModel.getTenantSettings(req.tenantId);
      return res.json(settings || {});
    } catch (error) {
      return this.handleError(res, error, "Failed to fetch tenant settings");
    }
  }

  /**
   * Update current tenant's settings
   */
  async updateSettings(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(403).json({ 
          message: "No tenant context found",
          code: "NO_TENANT_CONTEXT"
        });
      }

      // Validate request body against tenant settings schema
      const validation = tenantSettingsSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          message: 'Invalid settings data',
          code: 'VALIDATION_ERROR',
          errors: validation.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }

      const validatedSettings = validation.data;
      const updatedTenant = await TenantModel.updateTenantSettings(req.tenantId, validatedSettings);
      
      if (!updatedTenant) {
        return res.status(404).json({ message: 'Tenant not found' });
      }
      
      return res.json(updatedTenant.settings || {});
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Invalid settings data',
          code: 'VALIDATION_ERROR',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }
      return this.handleError(res, error, "Failed to update tenant settings");
    }
  }

  /**
   * Get tenant by slug (public endpoint)
   */
  async getBySlug(req: Request, res: Response) {
    try {
      const slug = req.params.slug;
      
      if (!slug) {
        return res.status(400).json({ 
          message: "Tenant slug is required",
          code: "SLUG_REQUIRED"
        });
      }

      const tenant = await TenantModel.getTenantBySlug(slug);
      
      if (!tenant) {
        return res.status(404).json({ 
          message: 'Tenant not found',
          code: "TENANT_NOT_FOUND"
        });
      }
      
      // Return only essential fields for public access
      return res.status(200).json({
        slug: tenant.slug,
        name: tenant.name,
        status: tenant.isActive,
        id: tenant.id
      });
    } catch (error) {
      return this.handleError(res, error, "Failed to fetch tenant by slug");
    }
  }
}