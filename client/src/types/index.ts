export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  settings: TenantSettings;
  createdAt: string;
}

export interface TenantSettings {
  // Company Information
  companyName?: string;
  address?: string;
  phone?: string;
  email?: string;
  
  branding?: {
    logoUrl?: string;
    favicon?: string;
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
  whatsapp?: {
    enabled?: boolean;
    accountSid?: string;
    authToken?: string;
    phoneNumber?: string;
    creditBalance?: number;
    lowCreditThreshold?: number;
    scheduler?: {
      enabled?: boolean;
      preferredSendHour?: number;
      reminderFrequency?: 'daily' | 'weekly' | 'monthly';
      sendOnWeekends?: boolean;
    };
    defaultTemplates?: {
      paymentReminder?: string;
      invoiceNotification?: string;
      welcomeMessage?: string;
    };
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
