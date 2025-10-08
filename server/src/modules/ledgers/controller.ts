import { Request, Response } from 'express';
import { BaseController } from '../../utils/base';
import { LedgerModel } from './model';
import { type AuthenticatedRequest } from '../../types';

export class LedgerController extends BaseController {
  private ledgerModel: LedgerModel;

  constructor() {
    super();
    this.ledgerModel = new LedgerModel();
  }

  async getCashbook(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const cashbook = await this.ledgerModel.getCashbook(tenantId);
      res.json(cashbook);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch cashbook');
    }
  }

  async getBankbook(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { bankAccountId } = req.query;
      
      const bankbook = await this.ledgerModel.getBankbook(tenantId, bankAccountId as string);
      res.json(bankbook);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch bankbook');
    }
  }

  async getVendorLedger(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { vendorId } = req.params;
      
      if (!vendorId) {
        return res.status(400).json({ message: 'Vendor ID is required' });
      }

      // Check if vendor exists
      const vendor = await this.ledgerModel.getVendorById(tenantId, vendorId);
      if (!vendor) {
        return res.status(404).json({ message: 'Vendor not found' });
      }

      const ledger = await this.ledgerModel.getVendorLedger(tenantId, vendorId);
      res.json(ledger);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch vendor ledger');
    }
  }

  async getRetailerLedger(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { retailerId } = req.params;
      
      if (!retailerId) {
        return res.status(400).json({ message: 'Retailer ID is required' });
      }

      // Check if retailer exists
      const retailer = await this.ledgerModel.getRetailerById(tenantId, retailerId);
      if (!retailer) {
        return res.status(404).json({ message: 'Retailer not found' });
      }

      const ledger = await this.ledgerModel.getRetailerLedger(tenantId, retailerId);
      res.json(ledger);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch retailer ledger');
    }
  }

  async getUdhaaarBook(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const udhaaarBook = await this.ledgerModel.getUdhaaarBook(tenantId);
      res.json(udhaaarBook);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch udhaar book');
    }
  }

  async getCrateLedger(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { retailerId } = req.query;
      
      // If retailerId is provided, validate it exists
      if (retailerId) {
        const retailer = await this.ledgerModel.getRetailerById(tenantId, retailerId as string);
        if (!retailer) {
          return res.status(404).json({ message: 'Retailer not found' });
        }
      }
      
      const crateLedger = await this.ledgerModel.getCrateLedger(tenantId, retailerId as string);
      res.json(crateLedger);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch crate ledger');
    }
  }
}