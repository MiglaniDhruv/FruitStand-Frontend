import { Request, Response, NextFunction, Router } from "express";
import { PaginationOptions, PaginationMetadata, PaginatedResult } from "@shared/schema";
import { ValidationError, NotFoundError, BadRequestError } from "../types";
import { handleDatabaseError } from "./database-errors";
import { z } from "zod";

// Base Controller class for common CRUD operations
export class BaseController {
  
  // Success response formatting
  protected sendSuccess(res: Response, data: any, message?: string, statusCode: number = 200) {
    const response: any = { data };
    if (message) response.message = message;
    return res.status(statusCode).json(response);
  }

  // Paginated response formatting
  protected sendPaginatedResponse(res: Response, data: any[], pagination: PaginationMetadata) {
    const response: PaginatedResult<any> = {
      data,
      pagination
    };
    return res.json(response);
  }

  // Extract pagination options from query parameters
  protected getPaginationOptions(query: any): PaginationOptions {
    return {
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 10,
      search: query.search || "",
      sortBy: query.sortBy || "createdAt",
      sortOrder: (query.sortOrder === "desc" ? "desc" : "asc") as "asc" | "desc"
    };
  }

  // Calculate pagination metadata
  protected calculatePagination(total: number, page: number, limit: number): PaginationMetadata {
    const totalPages = Math.ceil(total / limit);
    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1
    };
  }

  // Validate data with Zod schema and throw ValidationError if fails
  protected validateZodSchema<T>(schema: z.ZodSchema<T>, data: any): T {
    const result = schema.safeParse(data);
    if (!result.success) {
      throw new ValidationError("Validation failed", result.error);
    }
    return result.data;
  }

  // Ensure resource exists, throw NotFoundError if not
  protected ensureResourceExists(resource: any, resourceName: string): void {
    if (!resource) {
      throw new NotFoundError(resourceName);
    }
  }

  // Validate UUID format
  protected validateUUID(id: string, fieldName: string = 'ID'): void {
    const uuidSchema = z.string().uuid();
    const result = uuidSchema.safeParse(id);
    if (!result.success) {
      const fieldKey = fieldName.toLowerCase().replace(/\s+/g, '_');
      throw new ValidationError(`Invalid ${fieldName} format`, {
        [fieldKey]: `Invalid UUID format for ${fieldName}`
      });
    }
  }

  // Wrap database operations with error handling
  protected async wrapDatabaseOperation<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      handleDatabaseError(error);
    }
  }
}

// Base Router class for common route patterns
export class BaseRouter {
  protected router: Router;

  constructor() {
    this.router = Router();
  }

  // Get the configured router
  public getRouter(): Router {
    return this.router;
  }

  // Apply middleware to all routes
  protected applyMiddleware(middleware: any) {
    this.router.use(middleware);
  }

  // Setup common route patterns
  protected setupCrudRoutes(basePath: string, controller: any) {
    this.router.get(`${basePath}`, controller.getAll.bind(controller));
    this.router.get(`${basePath}/:id`, controller.getById.bind(controller));
    this.router.post(`${basePath}`, controller.create.bind(controller));
    this.router.put(`${basePath}/:id`, controller.update.bind(controller));
    this.router.delete(`${basePath}/:id`, controller.delete.bind(controller));
  }

  // Setup paginated list route
  protected setupPaginatedRoute(path: string, controller: any, method: string = "getAll") {
    this.router.get(path, controller[method].bind(controller));
  }
}

// Utility functions for common operations
export class RouteUtils {
  
  // Build SQL WHERE clause from filters
  static buildWhereClause(filters: any, allowedFields: string[]): string {
    const conditions: string[] = [];
    
    Object.keys(filters).forEach(key => {
      if (allowedFields.includes(key) && filters[key] !== undefined) {
        conditions.push(`${key} = $${key}`);
      }
    });
    
    return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  }

  // Build SQL ORDER BY clause
  static buildOrderByClause(sortBy: string, sortOrder: string, allowedFields: string[]): string {
    if (allowedFields.includes(sortBy)) {
      return `ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
    }
    return `ORDER BY created_at DESC`;
  }

  // Build SQL LIMIT/OFFSET clause for pagination
  static buildPaginationClause(page: number, limit: number): string {
    const offset = (page - 1) * limit;
    return `LIMIT ${limit} OFFSET ${offset}`;
  }

  // Validate required fields in request body
  static validateRequired(body: any, requiredFields: string[]): string[] {
    const missing: string[] = [];
    requiredFields.forEach(field => {
      if (!body[field]) {
        missing.push(field);
      }
    });
    return missing;
  }
}