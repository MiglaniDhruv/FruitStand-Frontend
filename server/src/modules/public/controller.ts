import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { InvoiceShareLinkModel } from '../invoice-share-links/model';
import { TenantModel } from '../tenants/model';
import { invoiceGenerator, SalesInvoiceWithDetails, PurchaseInvoiceWithPayments } from '../../services/pdf';
import { NotFoundError, ValidationError, InternalServerError } from '../../types';

const shareTokenParamsSchema = z.object({
  token: z.string().min(1, 'Share token is required')
});

export class PublicController {
  private shareModel = new InvoiceShareLinkModel();

  /**
   * Get public invoice data by share token
   * Public endpoint - no authentication required
   */
  async getSharedInvoice(req: Request, res: Response) {
    const { token } = shareTokenParamsSchema.parse(req.params);

    const publicInvoiceData = await this.shareModel.getPublicInvoiceData(token);

    if (!publicInvoiceData) {
      throw new NotFoundError('Shared invoice not found or access expired');
    }

    return res.json({
      success: true,
      data: publicInvoiceData
    });
  }

  /**
   * Download shared invoice as PDF
   * Public endpoint - no authentication required
   */
  async downloadPDF(req: Request, res: Response, next: NextFunction) {
    const { token } = shareTokenParamsSchema.parse(req.params);

    const publicInvoiceData = await this.shareModel.getPublicInvoiceData(token);

    if (!publicInvoiceData) {
      throw new NotFoundError('Shared invoice not found or access expired');
    }

    const tenantId = publicInvoiceData.invoice.tenantId;
    const tenant = await TenantModel.getTenant(tenantId);
    if (!tenant) throw new NotFoundError('Tenant');

    let doc: any, stream: any;

    if (publicInvoiceData.invoiceType === 'sales') {
      // Build SalesInvoiceWithDetails by spreading publicInvoiceData.invoice and attaching items, payments, and retailer
      const salesInvoiceData = {
        ...publicInvoiceData.invoice,
        items: publicInvoiceData.items,
        payments: publicInvoiceData.payments,
        retailer: publicInvoiceData.retailer!
      } as SalesInvoiceWithDetails;
      const result = await invoiceGenerator.generateSalesInvoicePDF(salesInvoiceData, tenant);
      doc = result.doc;
      stream = result.stream;
    } else if (publicInvoiceData.invoiceType === 'purchase') {
      // Build PurchaseInvoiceWithPayments with vendor similarly
      const purchaseInvoiceData = {
        ...publicInvoiceData.invoice,
        items: publicInvoiceData.items,
        payments: publicInvoiceData.payments,
        vendor: publicInvoiceData.vendor!
      } as PurchaseInvoiceWithPayments;
      const result = await invoiceGenerator.generatePurchaseInvoicePDF(purchaseInvoiceData, tenant);
      doc = result.doc;
      stream = result.stream;
    } else {
      throw new InternalServerError('Invalid invoice type');
    }

    // Compute prefix based on invoiceType to match other controllers
    const prefix = publicInvoiceData.invoiceType === 'sales' ? 'sales-invoice' : 'purchase-invoice';
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${prefix}-${publicInvoiceData.invoice.invoiceNumber}.pdf"`);

    stream.on('error', (err: any) => {
      if (!res.headersSent) return next(err);
      res.destroy(err);
    });

    stream.pipe(res);
  }

  /**
   * Health check for public API
   */
  async healthCheck(req: Request, res: Response) {
    return res.json({
      status: 'ok',
      message: 'Public API is operational',
      timestamp: new Date().toISOString()
    });
  }
}