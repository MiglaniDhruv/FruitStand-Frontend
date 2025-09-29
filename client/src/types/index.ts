export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  settings: TenantSettings;
  createdAt: string;
}

export interface TenantSettings {
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
    companyName?: string;
  };
  businessRules?: {
    commissionRates?: Record<string, number>;
    taxSettings?: Record<string, any>;
  };
  uiPreferences?: {
    theme?: string;
    dateFormat?: string;
    currency?: string;
  };
  support?: {
    email?: string;
    phone?: string;
  };
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

export interface DashboardKPIs {
  todaySales: string;
  pendingPayments: string;
  pendingInvoicesCount: number;
  activeVendors: number;
  stockValue: string;
  totalStockKgs: string;
}

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
