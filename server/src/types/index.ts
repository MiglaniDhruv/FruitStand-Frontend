import { Request } from "express";
import { type Tenant } from "@shared/schema";

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
  user?: { id: string; username: string; role: UserRole; tenantId: string };
  tenantId?: string;
  tenant?: Tenant;
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
  MANAGE_USERS = "manage_users",
  VIEW_USERS = "view_users",

  // Vendor management
  MANAGE_VENDORS = "manage_vendors",
  VIEW_VENDORS = "view_vendors",
  DELETE_VENDORS = "delete_vendors",

  // Item management
  MANAGE_ITEMS = "manage_items",
  VIEW_ITEMS = "view_items",
  DELETE_ITEMS = "delete_items",

  // Purchase Invoices
  CREATE_PURCHASE_INVOICES = "create_purchase_invoices",
  VIEW_PURCHASE_INVOICES = "view_purchase_invoices",
  EDIT_PURCHASE_INVOICES = "edit_purchase_invoices",
  DELETE_PURCHASE_INVOICES = "delete_purchase_invoices",

  // Payments
  CREATE_PAYMENTS = "create_payments",
  VIEW_PAYMENTS = "view_payments",
  EDIT_PAYMENTS = "edit_payments",
  DELETE_PAYMENTS = "delete_payments",

  // Stock management
  MANAGE_STOCK = "manage_stock",
  VIEW_STOCK = "view_stock",

  // Financial Reports & Ledgers
  VIEW_LEDGERS = "view_ledgers",
  VIEW_REPORTS = "view_reports",
  VIEW_CASHBOOK = "view_cashbook",
  VIEW_BANKBOOK = "view_bankbook",

  // Bank Accounts
  MANAGE_BANK_ACCOUNTS = "manage_bank_accounts",
  VIEW_BANK_ACCOUNTS = "view_bank_accounts",

  // System Settings
  MANAGE_SETTINGS = "manage_settings",
  VIEW_SETTINGS = "view_settings",

  // Dashboard & Analytics
  VIEW_DASHBOARD = "view_dashboard",
  VIEW_ANALYTICS = "view_analytics"
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