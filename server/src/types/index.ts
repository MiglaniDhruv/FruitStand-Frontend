import { Request } from "express";

// Authentication related types
export interface AuthUser {
  id: string;
  username: string;
  role: string;
  name: string;
  permissions: string[];
}

// Authenticated request interface
export interface AuthenticatedRequest extends Request {
  user?: { id: string; username: string; role: UserRole };
}

// Common API response structures
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
}

export interface ApiErrorResponse {
  message: string;
  error?: string;
  errors?: any;
}

// Role-based permissions
export enum UserRole {
  ADMIN = "Admin",
  OPERATOR = "Operator", 
  ACCOUNTANT = "Accountant"
}

export enum Permission {
  // User management
  USER_CREATE = "user.create",
  USER_READ = "user.read", 
  USER_UPDATE = "user.update",
  USER_DELETE = "user.delete",

  // Vendor management
  VENDOR_CREATE = "vendor.create",
  VENDOR_READ = "vendor.read",
  VENDOR_UPDATE = "vendor.update", 
  VENDOR_DELETE = "vendor.delete",

  // Item management
  ITEM_CREATE = "item.create",
  ITEM_READ = "item.read",
  ITEM_UPDATE = "item.update",
  ITEM_DELETE = "item.delete",

  // Invoice management
  INVOICE_CREATE = "invoice.create",
  INVOICE_READ = "invoice.read",
  INVOICE_UPDATE = "invoice.update",
  INVOICE_DELETE = "invoice.delete",

  // Payment management
  PAYMENT_CREATE = "payment.create",
  PAYMENT_READ = "payment.read",
  PAYMENT_UPDATE = "payment.update",
  PAYMENT_DELETE = "payment.delete",

  // Stock management
  STOCK_CREATE = "stock.create",
  STOCK_READ = "stock.read", 
  STOCK_UPDATE = "stock.update",
  STOCK_DELETE = "stock.delete",

  // Reports
  REPORTS_VIEW = "reports.view",
  REPORTS_EXPORT = "reports.export"
}

// Request/Response interfaces for common operations
export interface ListRequest {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CreateRequest<T> {
  data: T;
}

export interface UpdateRequest<T> {
  id: string;
  data: Partial<T>;
}

export interface DeleteRequest {
  id: string;
}

// Filter interfaces
export interface DateFilter {
  startDate?: string;
  endDate?: string;
}

export interface StatusFilter {
  status?: string;
}

export interface VendorFilter {
  vendorId?: string;
}

export interface RetailerFilter {
  retailerId?: string;
}

// Standardized error types
export class ValidationError extends Error {
  constructor(public fields: Record<string, string>) {
    super("Validation failed");
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = "Unauthorized access") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = "Insufficient permissions") {
    super(message);
    this.name = "ForbiddenError";
  }
}