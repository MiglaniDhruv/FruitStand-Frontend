import { Request, Response } from 'express';
import { z } from 'zod';
import { InvoiceShareLinkModel } from '../invoice-share-links/model';
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