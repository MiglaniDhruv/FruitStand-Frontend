import { format } from 'date-fns';

// Template variable interfaces
export interface SalesInvoiceVariables {
  retailerName: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: string;
  udhaaarAmount: string;
}

export interface PurchaseInvoiceVariables {
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  netAmount: string;
  balanceAmount: string;
}

export interface PaymentReminderVariables {
  recipientName: string;
  invoiceNumber: string;
  udhaaarAmount: string;
  dueDate: string;
}

export interface PaymentNotificationVariables {
  recipientName: string;
  invoiceNumber: string;
  paymentAmount: string;
  paymentDate: string;
  paymentMode: string;
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

// Builder functions
export function buildSalesInvoiceVariables(invoice: any, retailer: any): SalesInvoiceVariables {
  return {
    retailerName: truncateText(retailer.name || 'Customer'),
    invoiceNumber: invoice.invoiceNumber || '',
    invoiceDate: formatDate(invoice.invoiceDate),
    totalAmount: formatCurrency(invoice.totalAmount || '0'),
    udhaaarAmount: formatCurrency(invoice.udhaaarAmount || '0')
  };
}

export function buildPurchaseInvoiceVariables(invoice: any, vendor: any): PurchaseInvoiceVariables {
  return {
    vendorName: truncateText(vendor.name || 'Vendor'),
    invoiceNumber: invoice.invoiceNumber || '',
    invoiceDate: formatDate(invoice.invoiceDate),
    netAmount: formatCurrency(invoice.netAmount || '0'),
    balanceAmount: formatCurrency(invoice.balanceAmount || '0')
  };
}

export function buildPaymentReminderVariables(
  invoice: any, 
  recipient: any, 
  recipientType: 'vendor' | 'retailer'
): PaymentReminderVariables {
  // Calculate due date (assume 7 days from invoice date if not specified)
  const invoiceDate = new Date(invoice.invoiceDate);
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + 7);

  return {
    recipientName: truncateText(recipient.name || (recipientType === 'vendor' ? 'Vendor' : 'Customer')),
    invoiceNumber: invoice.invoiceNumber || '',
    udhaaarAmount: formatCurrency(recipientType === 'vendor' ? (invoice.balanceAmount || '0') : (invoice.udhaaarAmount || '0')),
    dueDate: formatDate(dueDate)
  };
}

export function buildPaymentNotificationVariables(
  payment: any, 
  invoice: any, 
  recipient: any
): PaymentNotificationVariables {
  return {
    recipientName: truncateText(recipient.name || 'Customer'),
    invoiceNumber: invoice.invoiceNumber || '',
    paymentAmount: formatCurrency(payment.amount || '0'),
    paymentDate: formatDate(payment.paymentDate),
    paymentMode: payment.paymentMode || 'Cash'
  };
}