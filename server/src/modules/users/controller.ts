import { Request, Response } from "express";
import { z } from "zod";
import { BaseController } from "../../utils/base";
import { UserModel } from "./model";
import { AuthenticatedRequest, Permission } from "../../types";
import { insertUserSchema } from "@shared/schema";

export class UserController extends BaseController {
  private userModel: UserModel;

  constructor() {
    super();
    this.userModel = new UserModel();
  }

  async getAll(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.tenantId) return res.status(403).json({ message: 'No tenant context found' });
      const tenantId = req.tenantId;
      
      // Check if pagination is requested
      const isPaginated = req.query.page || req.query.limit || req.query.paginated === 'true';
      
      if (!isPaginated) {
        // Return original array response for backward compatibility
        const users = await this.userModel.getUsers(tenantId);
        // Remove passwords from response
        const safeUsers = users.map(({ password, ...user }) => user);
        res.json(safeUsers);
        return;
      }

      // Extract pagination query parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const sortBy = req.query.sortBy as string;
      const sortOrder: 'asc' | 'desc' = (req.query.sortOrder as string) === 'desc' ? 'desc' : 'asc';
      
      // Validate pagination parameters
      if (page < 1) {
        return res.status(400).json({ message: "Page must be >= 1" });
      }
      
      if (limit < 1 || limit > 100) {
        return res.status(400).json({ message: "Limit must be between 1 and 100" });
      }
      
      // Validate sortBy if provided
      const validSortFields = ['username', 'name', 'role', 'createdAt'];
      if (sortBy && !validSortFields.includes(sortBy)) {
        return res.status(400).json({ message: "Invalid sortBy field" });
      }
      
      const paginationOptions = { page, limit, search, sortBy, sortOrder };
      const result = await this.userModel.getUsersPaginated(tenantId, paginationOptions);
      
      // Remove passwords from response
      const safeData = result.data.map(({ password, ...user }) => user);
      const safeResult = { ...result, data: safeData };
      
      res.json(safeResult);
    } catch (error) {
      return this.handleError(res, error, "Failed to fetch users");
    }
  }

  async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const user = await this.userModel.getUser(tenantId, req.params.id);
      if (!user) {
        return this.sendNotFound(res, "User not found in organization");
      }
      
      // Remove password from response
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      return this.handleError(res, error, "Failed to fetch user");
    }
  }

  async create(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const userData = insertUserSchema.parse(req.body);
      const user = await this.userModel.createUser(tenantId, userData);
      
      // Remove password from response
      const { password, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return this.sendValidationError(res, error.errors);
      }
      return this.handleError(res, error, "Failed to create user");
    }
  }

  async update(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const userData = insertUserSchema.partial().parse(req.body);
      const user = await this.userModel.updateUser(tenantId, req.params.id, userData);
      
      if (!user) {
        return this.sendNotFound(res, "User not found in organization");
      }
      
      // Remove password from response
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return this.sendValidationError(res, error.errors);
      }
      return this.handleError(res, error, "Failed to update user");
    }
  }

  async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const success = await this.userModel.deleteUser(tenantId, req.params.id);
      if (!success) {
        return this.sendNotFound(res, "User not found in organization");
      }
      res.status(204).send();
    } catch (error) {
      return this.handleError(res, error, "Failed to delete user");
    }
  }

  async updatePermissions(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const schema = z.object({ permissions: z.array(z.nativeEnum(Permission)) });
      const { permissions } = schema.parse(req.body);
      
      const user = await this.userModel.updateUserPermissions(tenantId, req.params.id, permissions);
      if (!user) {
        return this.sendNotFound(res, "User not found in organization");
      }
      
      // Remove password from response
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return this.sendValidationError(res, error.errors);
      }
      return this.handleError(res, error, "Failed to update user permissions");
    }
  }
}