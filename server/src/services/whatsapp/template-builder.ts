import { format } from 'date-fns';

// Template variable interfaces
export interface SalesInvoiceVariables {
  retailerName: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: string;
  udhaaarAmount: string;
  businessName?: string;
  businessPhone?: string;
  businessAddress?: string;
  contactPerson?: string;
  retailerAddress?: string;
  address?: string;
  invoiceToken?: string;
}

export interface PurchaseInvoiceVariables {
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  netAmount: string;
  balanceAmount: string;
  businessName?: string;
  businessPhone?: string;
  businessAddress?: string;
  vendorAddress?: string;
  address?: string;
  invoiceToken?: string;
}

export interface PaymentReminderVariables {
  recipientName: string;
  invoiceNumber: string;
  udhaaarAmount: string;
  dueDate: string;
  businessName?: string;
  businessPhone?: string;
  businessAddress?: string;
  recipientAddress?: string;
  address?: string;
  invoiceToken?: string;
}

export interface PaymentNotificationVariables {
  recipientName: string;
  invoiceNumber: string;
  paymentAmount: string;
  paymentDate: string;
  paymentMode: string;
  businessName?: string;
  businessPhone?: string;
  businessAddress?: string;
  recipientAddress?: string;
  address?: string;
  invoiceToken?: string;
}

// Formatting helpers
export function formatCurrency(amount: string | number): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `₹${numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'dd MMM yyyy');
}

export function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export function formatAddress(address: string | null | undefined, maxLength: number = 100): string | undefined {
  if (!address) return undefined;
  
  // Replace newline characters with spaces
  let formatted = address.replace(/\r\n|\r|\n/g, ' ');
  
  // Replace multiple consecutive spaces with single space
  formatted = formatted.replace(/\s+/g, ' ');
  
  // Trim whitespace
  formatted = formatted.trim();
  
  // Return undefined if the normalized address is empty
  if (!formatted) return undefined;
  
  // Truncate if needed
  if (formatted.length > maxLength) {
    formatted = formatted.substring(0, maxLength - 3) + '...';
  }
  
  return formatted;
}

// Builder functions
export function buildSalesInvoiceVariables(invoice: any, retailer: any, tenant?: any, invoiceToken?: string): SalesInvoiceVariables {
  return {
    retailerName: truncateText(retailer.name || 'Customer'),
    invoiceNumber: invoice.invoiceNumber || '',
    invoiceDate: formatDate(invoice.invoiceDate),
    totalAmount: formatCurrency(invoice.totalAmount || '0'),
    udhaaarAmount: formatCurrency(invoice.udhaaarAmount || '0'),
    businessName: tenant?.name ? truncateText(tenant.name, 50) : undefined,
    businessPhone: tenant?.settings?.phone || undefined,
    businessAddress: tenant?.settings?.address ? formatAddress(tenant.settings.address) : undefined,
    retailerAddress: retailer?.address ? formatAddress(retailer.address) : undefined,
    address: retailer?.address ? formatAddress(retailer.address) : undefined,
    invoiceToken
  };
}

export function buildPurchaseInvoiceVariables(invoice: any, vendor: any, tenant?: any, invoiceToken?: string): PurchaseInvoiceVariables {
  return {
    vendorName: truncateText(vendor.name || 'Vendor'),
    invoiceNumber: invoice.invoiceNumber || '',
    invoiceDate: formatDate(invoice.invoiceDate),
    netAmount: formatCurrency(invoice.netAmount || '0'),
    balanceAmount: formatCurrency(invoice.balanceAmount || '0'),
    businessName: tenant?.name ? truncateText(tenant.name, 50) : undefined,
    businessPhone: tenant?.settings?.phone || undefined,
    businessAddress: tenant?.settings?.address ? formatAddress(tenant.settings.address) : undefined,
    vendorAddress: vendor?.address ? formatAddress(vendor.address) : undefined,
    address: vendor?.address ? formatAddress(vendor.address) : undefined,
    invoiceToken
  };
}

export function buildPaymentReminderVariables(
  invoice: any, 
  recipient: any, 
  recipientType: 'vendor' | 'retailer',
  tenant?: any,
  invoiceToken?: string
): PaymentReminderVariables {
  // Calculate due date (assume 7 days from invoice date if not specified)
  const invoiceDate = new Date(invoice.invoiceDate);
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + 7);

  return {
    recipientName: truncateText(recipient.name || (recipientType === 'vendor' ? 'Vendor' : 'Customer')),
    invoiceNumber: invoice.invoiceNumber || '',
    udhaaarAmount: formatCurrency(recipientType === 'vendor' ? (invoice.balanceAmount || '0') : (invoice.udhaaarAmount || '0')),
    dueDate: formatDate(dueDate),
    businessName: tenant?.name ? truncateText(tenant.name, 50) : undefined,
    businessPhone: tenant?.settings?.phone || undefined,
    businessAddress: tenant?.settings?.address ? formatAddress(tenant.settings.address) : undefined,
    recipientAddress: recipient?.address ? formatAddress(recipient.address) : undefined,
    address: recipient?.address ? formatAddress(recipient.address) : undefined,
    invoiceToken
  };
}

export function buildPaymentNotificationVariables(
  payment: any, 
  invoice: any, 
  recipient: any,
  tenant?: any,
  invoiceToken?: string
): PaymentNotificationVariables {
  return {
    recipientName: truncateText(recipient.name || 'Customer'),
    invoiceNumber: invoice.invoiceNumber || '',
    paymentAmount: formatCurrency(payment.amount || '0'),
    paymentDate: formatDate(payment.paymentDate),
    paymentMode: payment.paymentMode || 'Cash',
    businessName: tenant?.name ? truncateText(tenant.name, 50) : undefined,
    businessPhone: tenant?.settings?.phone || undefined,
    businessAddress: tenant?.settings?.address ? formatAddress(tenant.settings.address) : undefined,
    recipientAddress: recipient?.address ? formatAddress(recipient.address) : undefined,
    address: recipient?.address ? formatAddress(recipient.address) : undefined,
    invoiceToken
  };
}