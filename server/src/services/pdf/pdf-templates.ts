import PDFDocument from 'pdfkit';
import { 
  SalesInvoiceWithDetails, 
  InvoiceWithItems, 
  Tenant, 
  TenantSettings, 
  Payment,
  SalesPayment,
  Retailer,
  Vendor,
  SalesInvoiceItem,
  InvoiceItem
} from '@shared/schema';
import { 
  formatCurrency, 
  formatDate, 
  formatAddress 
} from '../whatsapp/template-builder.js';

// Extended type for purchase invoice with payments
export type PurchaseInvoiceWithPayments = InvoiceWithItems & {
  payments?: Payment[];
};

// Styling constants
const COLORS = {
  primary: '#1f2937',
  secondary: '#374151',
  accent: '#3b82f6',
  light: '#f3f4f6',
  text: '#111827',
  muted: '#6b7280'
};

const FONTS = {
  title: 20,
  heading: 14,
  subheading: 12,
  body: 10,
  small: 8
};

const MARGINS = {
  page: 50,
  section: 15,
  line: 5
};

/**
 * Draw company header with logo placeholder and business details
 */
export function drawHeader(doc: InstanceType<typeof PDFDocument>, tenant: Tenant, invoiceType: string): number {
  let yPosition = doc.page.margins.top;

  // Company name in large bold font
  doc.fontSize(FONTS.title)
     .fillColor(COLORS.primary)
     .font('Helvetica-Bold')
     .text(tenant.name || 'Company Name', 50, yPosition);

  yPosition += 30;

  // Company details
  const settings = tenant.settings as TenantSettings | undefined;
  if (settings?.address || settings?.phone) {
    doc.fontSize(FONTS.body)
       .fillColor(COLORS.text)
       .font('Helvetica');

    if (settings?.address) {
      const address = formatAddress(settings.address, 200);
      if (address) {
        doc.text(address, 50, yPosition);
        yPosition += 15;
      }
    }

    if (settings?.phone) {
      doc.text(`Phone: ${settings.phone}`, 50, yPosition);
      yPosition += 15;
    }
  }

  yPosition += 10;

  // Horizontal line separator
  doc.strokeColor(COLORS.secondary)
     .lineWidth(1)
     .moveTo(50, yPosition)
     .lineTo(doc.page.width - 50, yPosition)
     .stroke();

  yPosition += 20;

  // Invoice type title centered
  const title = invoiceType.toUpperCase();
  const titleWidth = doc.widthOfString(title);
  const centerX = (doc.page.width - titleWidth) / 2;

  doc.fontSize(FONTS.heading)
     .fillColor(COLORS.primary)
     .font('Helvetica-Bold')
     .text(title, centerX, yPosition);

  yPosition += 40;

  return yPosition;
}

/**
 * Draw invoice details in two-column layout
 */
export function drawInvoiceDetails(doc: InstanceType<typeof PDFDocument>, invoice: SalesInvoiceWithDetails | PurchaseInvoiceWithPayments, yPosition: number): number {
  const leftColumn = 50;
  const rightColumn = doc.page.width / 2 + 25;
  const startY = yPosition;

  doc.fontSize(FONTS.body)
     .fillColor(COLORS.text)
     .font('Helvetica');

  // Left column
  doc.font('Helvetica-Bold').text('Invoice Number:', leftColumn, yPosition);
  doc.font('Helvetica').text(invoice.invoiceNumber || 'N/A', leftColumn + 100, yPosition);
  yPosition += 15;

  doc.font('Helvetica-Bold').text('Invoice Date:', leftColumn, yPosition);
  doc.font('Helvetica').text(formatDate(invoice.invoiceDate), leftColumn + 100, yPosition);
  yPosition += 15;

  doc.font('Helvetica-Bold').text('Status:', leftColumn, yPosition);
  doc.font('Helvetica').text(invoice.status || 'Draft', leftColumn + 100, yPosition);

  // Right column
  yPosition = startY;
  const totalAmount = 'totalAmount' in invoice ? invoice.totalAmount : invoice.netAmount;
  const paidAmount = invoice.paidAmount || '0';
  const balanceAmount = invoice.balanceAmount || '0';

  doc.font('Helvetica-Bold').text('Total Amount:', rightColumn, yPosition);
  doc.font('Helvetica').text(formatCurrency(totalAmount || '0'), rightColumn + 100, yPosition);
  yPosition += 15;

  doc.font('Helvetica-Bold').text('Paid Amount:', rightColumn, yPosition);
  doc.font('Helvetica').text(formatCurrency(paidAmount), rightColumn + 100, yPosition);
  yPosition += 15;

  doc.font('Helvetica-Bold').text('Balance Amount:', rightColumn, yPosition);
  doc.font('Helvetica-Bold').fillColor(COLORS.accent).text(formatCurrency(balanceAmount), rightColumn + 100, yPosition);

  return Math.max(yPosition + 30, startY + 60);
}

/**
 * Draw party details (retailer/vendor information)
 */
export function drawPartyDetails(doc: InstanceType<typeof PDFDocument>, party: Retailer | Vendor, partyType: string, yPosition: number): number {
  doc.fontSize(FONTS.subheading)
     .fillColor(COLORS.primary)
     .font('Helvetica-Bold')
     .text(partyType === 'retailer' ? 'Bill To:' : 'Bill From:', 50, yPosition);

  yPosition += 20;

  doc.fontSize(FONTS.body)
     .fillColor(COLORS.text)
     .font('Helvetica-Bold')
     .text(party.name || 'N/A', 50, yPosition);

  yPosition += 15;

  if (party.phone) {
    doc.font('Helvetica').text(`Phone: ${party.phone}`, 50, yPosition);
    yPosition += 12;
  }

  if (party.address) {
    const address = formatAddress(party.address, 150);
    if (address) {
      doc.font('Helvetica').text(address, 50, yPosition);
      yPosition += 15;
    }
  }

  return yPosition + 20;
}

/**
 * Helper function to draw table header
 */
function drawItemsHeader(doc: InstanceType<typeof PDFDocument>, tableLeft: number, tableTop: number, colWidths: any, tableWidth: number): void {
  // Table header
  doc.rect(tableLeft, tableTop, tableWidth, 25)
     .fillAndStroke(COLORS.light, COLORS.secondary);

  doc.fontSize(FONTS.body)
     .fillColor(COLORS.text)
     .font('Helvetica-Bold');

  let xPos = tableLeft + 5;
  doc.text('Sr.', xPos, tableTop + 8);
  xPos += colWidths.sr;
  doc.text('Item Description', xPos, tableTop + 8);
  xPos += colWidths.description;
  doc.text('Crates', xPos, tableTop + 8);
  xPos += colWidths.crates;
  doc.text('Boxes', xPos, tableTop + 8);
  xPos += colWidths.boxes;
  doc.text('Weight (Kg)', xPos, tableTop + 8);
  xPos += colWidths.weight;
  doc.text('Rate', xPos, tableTop + 8);
  xPos += colWidths.rate;
  doc.text('Amount', xPos, tableTop + 8);
}

/**
 * Draw items table with headers and rows
 */
export function drawItemsTable(doc: InstanceType<typeof PDFDocument>, items: SalesInvoiceItem[] | InvoiceItem[], yPosition: number): number {
  const tableTop = yPosition;
  const tableLeft = 50;
  const tableWidth = doc.page.width - 100;
  
  // Column widths adjusted for crates, boxes, weight
  const colWidths = {
    sr: 30,
    description: 140,
    crates: 50,
    boxes: 50,
    weight: 60,
    rate: 70,
    amount: 80
  };

  // Draw initial header
  drawItemsHeader(doc, tableLeft, tableTop, colWidths, tableWidth);

  yPosition = tableTop + 25;
  let subtotal = 0;

  // Table rows
  items.forEach((item, index) => {
    // Check if we need a new page
    if (yPosition > doc.page.height - 150) {
      doc.addPage();
      yPosition = doc.page.margins.top;
      // Re-draw header after page break
      drawItemsHeader(doc, tableLeft, yPosition, colWidths, tableWidth);
      yPosition += 25;
    }

    const rowHeight = 20;
    
    // Alternate row colors
    if (index % 2 === 0) {
      doc.rect(tableLeft, yPosition, tableWidth, rowHeight)
         .fill(COLORS.light);
    }

    doc.fontSize(FONTS.body)
       .fillColor(COLORS.text)
       .font('Helvetica');

    let xPos = tableLeft + 5;
    doc.text((index + 1).toString(), xPos, yPosition + 6);
    xPos += colWidths.sr;
    
    // Improved item name fallback - items don't have related item object by default
    const itemName = `Item ${item.itemId?.slice(0,8) ?? 'Unknown'}`.trim();
    doc.text(itemName, xPos, yPosition + 6, { width: colWidths.description - 10 });
    xPos += colWidths.description;
    
    // Use schema-aligned fields: crates, boxes, weight
    const crates = parseFloat(item.crates || '0');
    doc.text(crates > 0 ? crates.toString() : '-', xPos, yPosition + 6);
    xPos += colWidths.crates;
    
    const boxes = parseFloat(item.boxes || '0');
    doc.text(boxes > 0 ? boxes.toString() : '-', xPos, yPosition + 6);
    xPos += colWidths.boxes;
    
    const weight = parseFloat(item.weight || '0');
    doc.text(weight > 0 ? `${weight} kg` : '-', xPos, yPosition + 6);
    xPos += colWidths.weight;
    
    const rate = formatCurrency(item.rate || 0);
    doc.text(rate, xPos, yPosition + 6);
    xPos += colWidths.rate;
    
    const amount = parseFloat(item.amount || '0');
    subtotal += amount;
    doc.text(formatCurrency(amount), xPos, yPosition + 6);

    yPosition += rowHeight;
  });

  // Subtotal row
  yPosition += 10;
  doc.fontSize(FONTS.body)
     .fillColor(COLORS.text)
     .font('Helvetica-Bold');

  const subtotalY = yPosition;
  doc.text('Subtotal:', doc.page.width - 180, subtotalY);
  doc.text(formatCurrency(subtotal), doc.page.width - 100, subtotalY);

  return yPosition + 30;
}

/**
 * Draw financial summary section
 */
export function drawFinancialSummary(doc: InstanceType<typeof PDFDocument>, invoice: SalesInvoiceWithDetails | PurchaseInvoiceWithPayments, invoiceType: string, yPosition: number): number {
  const rightAlign = doc.page.width - 200;
  const labelWidth = 120;

  doc.fontSize(FONTS.body)
     .fillColor(COLORS.text)
     .font('Helvetica');

  if (invoiceType === 'sales') {
    // Sales invoice summary
    const salesInvoice = invoice as SalesInvoiceWithDetails;
    
    if (salesInvoice.totalAmount) {
      doc.font('Helvetica-Bold').text('Total Amount:', rightAlign, yPosition);
      doc.font('Helvetica').text(formatCurrency(salesInvoice.totalAmount), rightAlign + labelWidth, yPosition);
      yPosition += 15;
    }

    if (salesInvoice.paidAmount) {
      doc.font('Helvetica-Bold').text('Paid Amount:', rightAlign, yPosition);
      doc.font('Helvetica').text(formatCurrency(salesInvoice.paidAmount), rightAlign + labelWidth, yPosition);
      yPosition += 15;
    }

    if (salesInvoice.udhaaarAmount) {
      doc.font('Helvetica-Bold').text('Udhaaar Amount:', rightAlign, yPosition);
      doc.font('Helvetica').text(formatCurrency(salesInvoice.udhaaarAmount), rightAlign + labelWidth, yPosition);
      yPosition += 15;
    }

    if (salesInvoice.shortfallAmount) {
      doc.font('Helvetica-Bold').text('Shortfall Amount:', rightAlign, yPosition);
      doc.font('Helvetica').text(formatCurrency(salesInvoice.shortfallAmount), rightAlign + labelWidth, yPosition);
      yPosition += 15;
    }

    if (salesInvoice.balanceAmount) {
      doc.font('Helvetica-Bold').fillColor(COLORS.accent).text('Balance:', rightAlign, yPosition);
      doc.font('Helvetica-Bold').text(formatCurrency(salesInvoice.balanceAmount), rightAlign + labelWidth, yPosition);
      yPosition += 15;
    }
  } else {
    // Purchase invoice summary - using correct schema fields
    const purchaseInvoice = invoice as PurchaseInvoiceWithPayments;
    
    if (purchaseInvoice.totalSelling) {
      doc.font('Helvetica-Bold').text('Total Selling:', rightAlign, yPosition);
      doc.font('Helvetica').text(formatCurrency(purchaseInvoice.totalSelling), rightAlign + labelWidth, yPosition);
      yPosition += 15;
    }

    if (purchaseInvoice.totalExpense) {
      doc.font('Helvetica-Bold').text('Total Expense:', rightAlign, yPosition);
      doc.font('Helvetica').text(formatCurrency(purchaseInvoice.totalExpense), rightAlign + labelWidth, yPosition);
      yPosition += 15;
    }

    if (purchaseInvoice.totalLessExpenses) {
      doc.font('Helvetica-Bold').text('Less Expenses:', rightAlign, yPosition);
      doc.font('Helvetica').text(formatCurrency(purchaseInvoice.totalLessExpenses), rightAlign + labelWidth, yPosition);
      yPosition += 15;
    }

    if (purchaseInvoice.netAmount) {
      doc.font('Helvetica-Bold').text('Net Amount:', rightAlign, yPosition);
      doc.font('Helvetica').text(formatCurrency(purchaseInvoice.netAmount), rightAlign + labelWidth, yPosition);
      yPosition += 15;
    }

    if (purchaseInvoice.paidAmount) {
      doc.font('Helvetica-Bold').text('Paid Amount:', rightAlign, yPosition);
      doc.font('Helvetica').text(formatCurrency(purchaseInvoice.paidAmount), rightAlign + labelWidth, yPosition);
      yPosition += 15;
    }

    if (purchaseInvoice.balanceAmount) {
      doc.font('Helvetica-Bold').fillColor(COLORS.accent).text('Balance:', rightAlign, yPosition);
      doc.font('Helvetica-Bold').text(formatCurrency(purchaseInvoice.balanceAmount), rightAlign + labelWidth, yPosition);
      yPosition += 15;
    }
  }

  return yPosition + 20;
}

/**
 * Draw payment history table
 */
export function drawPaymentHistory(doc: InstanceType<typeof PDFDocument>, payments: Payment[] | SalesPayment[], yPosition: number): number {
  if (!payments || payments.length === 0) {
    return yPosition;
  }

  // Section header
  doc.fontSize(FONTS.subheading)
     .fillColor(COLORS.primary)
     .font('Helvetica-Bold')
     .text('Payment History:', 50, yPosition);

  yPosition += 25;

  const tableLeft = 50;
  const tableWidth = doc.page.width - 100;
  const colWidths = { date: 80, amount: 80, mode: 80, reference: 150 };

  // Table header
  doc.rect(tableLeft, yPosition, tableWidth, 20)
     .fillAndStroke(COLORS.light, COLORS.secondary);

  doc.fontSize(FONTS.small)
     .fillColor(COLORS.text)
     .font('Helvetica-Bold');

  let xPos = tableLeft + 5;
  doc.text('Date', xPos, yPosition + 6);
  xPos += colWidths.date;
  doc.text('Amount', xPos, yPosition + 6);
  xPos += colWidths.amount;
  doc.text('Mode', xPos, yPosition + 6);
  xPos += colWidths.mode;
  doc.text('Reference', xPos, yPosition + 6);

  yPosition += 20;

  // Payment rows
  payments.forEach((payment, index) => {
    if (yPosition > doc.page.height - 100) {
      doc.addPage();
      yPosition = doc.page.margins.top;
    }

    const rowHeight = 15;
    
    if (index % 2 === 0) {
      doc.rect(tableLeft, yPosition, tableWidth, rowHeight)
         .fill(COLORS.light);
    }

    doc.fontSize(FONTS.small)
       .fillColor(COLORS.text)
       .font('Helvetica');

    xPos = tableLeft + 5;
    doc.text(formatDate(payment.paymentDate), xPos, yPosition + 3);
    xPos += colWidths.date;
    doc.text(formatCurrency(payment.amount), xPos, yPosition + 3);
    xPos += colWidths.amount;
    doc.text(payment.paymentMode || 'Cash', xPos, yPosition + 3);
    xPos += colWidths.mode;
    doc.text(payment.upiReference || payment.chequeNumber || '-', xPos, yPosition + 3, { width: colWidths.reference - 10 });

    yPosition += rowHeight;
  });

  return yPosition + 20;
}

/**
 * Draw footer with page numbers and timestamp
 */
export function drawFooter(doc: InstanceType<typeof PDFDocument>): void {
  const footerY = doc.page.height - 50;

  // Horizontal line
  doc.strokeColor(COLORS.secondary)
     .lineWidth(1)
     .moveTo(50, footerY - 10)
     .lineTo(doc.page.width - 50, footerY - 10)
     .stroke();

  doc.fontSize(FONTS.small)
     .fillColor(COLORS.muted)
     .font('Helvetica');

  // Generation timestamp
  const timestamp = formatDate(new Date());
  doc.text(`Generated on: ${timestamp}`, 50, footerY);

  // Page numbers (if multiple pages)
  const range = doc.bufferedPageRange();
  if (range.count > 1) {
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      const pageText = `Page ${i + 1} of ${range.count}`;
      const pageWidth = doc.widthOfString(pageText);
      doc.text(pageText, doc.page.width - 50 - pageWidth, footerY);
    }
  }
}

/**
 * Render complete sales invoice template
 */
export function renderSalesInvoiceTemplate(
  doc: InstanceType<typeof PDFDocument>, 
  invoice: SalesInvoiceWithDetails, 
  tenant: Tenant
): void {
  let yPosition = drawHeader(doc, tenant, 'Sales Invoice');
  
  yPosition = drawInvoiceDetails(doc, invoice, yPosition);
  
  yPosition = drawPartyDetails(doc, invoice.retailer, 'retailer', yPosition);
  
  yPosition = drawItemsTable(doc, invoice.items, yPosition);
  
  yPosition = drawFinancialSummary(doc, invoice, 'sales', yPosition);
  
  yPosition = drawPaymentHistory(doc, invoice.payments, yPosition);
  
  drawFooter(doc);
}

/**
 * Render complete purchase invoice template
 */
export function renderPurchaseInvoiceTemplate(
  doc: InstanceType<typeof PDFDocument>, 
  invoice: PurchaseInvoiceWithPayments, 
  tenant: Tenant
): void {
  let yPosition = drawHeader(doc, tenant, 'Purchase Invoice');
  
  yPosition = drawInvoiceDetails(doc, invoice, yPosition);
  
  yPosition = drawPartyDetails(doc, invoice.vendor, 'vendor', yPosition);
  
  yPosition = drawItemsTable(doc, invoice.items, yPosition);
  
  yPosition = drawFinancialSummary(doc, invoice, 'purchase', yPosition);
  
  // Purchase invoices may not have payments
  if (invoice.payments && invoice.payments.length > 0) {
    yPosition = drawPaymentHistory(doc, invoice.payments, yPosition);
  }
  
  drawFooter(doc);
}

// Export types for external use
export type { SalesInvoiceWithDetails };