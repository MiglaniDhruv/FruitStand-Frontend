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
