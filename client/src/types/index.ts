import type { TenantSettings } from "../../shared/schema.js";

// Re-export TenantSettings from shared schema to centralize type definitions
export type { TenantSettings };

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  settings: TenantSettings;
  createdAt: string;
}

export interface TenantContext {
  user: {
    id: string;
    username: string;
    name: string;
    role: string;
    tenantId: string;
    permissions?: string[];
  };
  tenant: TenantInfo;
}

export interface TenantSessionContext {
  user: {
    id: string;
    username: string;
    name: string;
    role: string;
    tenantId: string;
    permissions?: string[];
  };
  tenantId: string;
}

// Re-export dashboard types from shared schema to keep server and client types in sync
export type { DashboardKPIs, RecentPurchase, RecentSale, FavouriteRetailer, FavouriteVendor } from '../../shared/schema.js';

// Re-export report types from shared schema to keep server and client types in sync
export type { 
  TurnoverReportData, 
  ProfitLossReportData, 
  CommissionReportData, 
  ShortfallReportData, 
  ExpensesSummaryData, 
  VendorsListData, 
  RetailersListData 
} from '../../shared/schema.js';

export interface CreateInvoiceItem {
  commodityId: string;
  quantity: string;
  rate: string;
  amount: string;
}

export interface CreateInvoiceData {
  vendorId: string;
  invoiceDate: string;
  grossAmount: string;
  commissionRate: string;
  commissionAmount: string;
  freightCharges: string;
  laborCharges: string;
  netPayable: string;
  items: CreateInvoiceItem[];
}