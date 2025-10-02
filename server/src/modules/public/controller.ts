import { Request, Response } from 'express';
import { z } from 'zod';
import { InvoiceShareLinkModel } from '../invoice-share-links/model.js';

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
    try {
      const { token } = shareTokenParamsSchema.parse(req.params);

      const publicInvoiceData = await this.shareModel.getPublicInvoiceData(token);

      if (!publicInvoiceData) {
        return res.status(404).json({
          error: 'Shared invoice not found or access expired',
          details: 'The shared link may have been revoked or the invoice may no longer be available'
        });
      }

      // Return the complete public invoice data
      return res.json({
        success: true,
        data: publicInvoiceData
      });
    } catch (error) {
      console.error('Error fetching shared invoice:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid request parameters',
          details: error.errors
        });
      }
      
      return res.status(500).json({
        error: 'Failed to fetch shared invoice',
        details: 'An unexpected error occurred while retrieving the shared invoice'
      });
    }
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