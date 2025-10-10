import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import { SalesInvoiceWithDetails, Tenant } from '@shared/schema';
import { 
  renderSalesInvoiceTemplate,
  renderPurchaseInvoiceTemplate,
  type PurchaseInvoiceWithPayments
} from './pdf-templates';

export class InvoiceGenerator {
  /**
   * Generate PDF for sales invoice
   */
  async generateSalesInvoicePDF(invoice: SalesInvoiceWithDetails, tenant: Tenant): Promise<{ doc: InstanceType<typeof PDFDocument>; stream: PassThrough }> {
    try {
      // Validate required data
      if (!invoice) {
        throw new Error('Invoice data is required');
      }
      if (!tenant) {
        throw new Error('Tenant data is required');
      }
      if (!invoice.items || invoice.items.length === 0) {
        throw new Error('Invoice must have at least one item');
      }

      // Create new PDF document with bufferPages for page numbering
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true,
        info: {
          Title: `Sales Invoice ${invoice.invoiceNumber}`,
          Author: tenant.name || 'FruitStand',
          Subject: 'Sales Invoice',
          Keywords: 'invoice, sales'
        }
      });

      // Create stream and pipe before rendering
      const stream = new PassThrough();
      doc.pipe(stream);

      // Render the template (no await, no end)
      renderSalesInvoiceTemplate(doc, invoice, tenant);

      // End the document after rendering
      doc.end();

      return { doc, stream };
    } catch (error) {
      throw new Error(`Failed to generate sales invoice PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate PDF for purchase invoice
   */
  async generatePurchaseInvoicePDF(invoice: PurchaseInvoiceWithPayments, tenant: Tenant): Promise<{ doc: InstanceType<typeof PDFDocument>; stream: PassThrough }> {
    try {
      // Validate required data
      if (!invoice) {
        throw new Error('Invoice data is required');
      }
      if (!tenant) {
        throw new Error('Tenant data is required');
      }
      if (!invoice.items || invoice.items.length === 0) {
        throw new Error('Invoice must have at least one item');
      }

      // Create new PDF document with bufferPages for page numbering
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true,
        info: {
          Title: `Purchase Invoice ${invoice.invoiceNumber}`,
          Author: tenant.name || 'FruitStand',
          Subject: 'Purchase Invoice',
          Keywords: 'invoice, purchase'
        }
      });

      // Create stream and pipe before rendering
      const stream = new PassThrough();
      doc.pipe(stream);

      // Render the template (no await, no end)
      renderPurchaseInvoiceTemplate(doc, invoice, tenant);

      // End the document after rendering
      doc.end();

      return { doc, stream };
    } catch (error) {
      throw new Error(`Failed to generate purchase invoice PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance for convenience
export const invoiceGenerator = new InvoiceGenerator();