import { Request, Response } from 'express';
import { BaseController } from '../../utils/base';
import { LedgerModel } from './model';
import { TenantModel } from '../tenants/model';
import { type AuthenticatedRequest, ForbiddenError, BadRequestError, NotFoundError } from '../../types';

export class LedgerController extends BaseController {
  private ledgerModel: LedgerModel;

  constructor() {
    super();
    this.ledgerModel = new LedgerModel();
  }

  async getCashbook(req: AuthenticatedRequest, res: Response) {
    if (!req.tenantId) throw new ForbiddenError('No tenant context found');
    const tenantId = req.tenantId;
    
    const cashbook = await this.ledgerModel.getCashbook(tenantId);
    res.json(cashbook);
  }

  async getBankbook(req: AuthenticatedRequest, res: Response) {
    if (!req.tenantId) throw new ForbiddenError('No tenant context found');
    const tenantId = req.tenantId;
    
    const { bankAccountId } = req.query;
    
    const bankbook = await this.ledgerModel.getBankbook(tenantId, bankAccountId as string);
    res.json(bankbook);
  }

  async getVendorLedger(req: AuthenticatedRequest, res: Response) {
    if (!req.tenantId) throw new ForbiddenError('No tenant context found');
    const tenantId = req.tenantId;
    
    const { vendorId } = req.params;
    this.validateUUID(vendorId, 'Vendor ID');

    // Check if vendor exists
    const vendor = await this.ledgerModel.getVendorById(tenantId, vendorId);
    this.ensureResourceExists(vendor, 'Vendor');

    const ledger = await this.ledgerModel.getVendorLedger(tenantId, vendorId);
    res.json(ledger);
  }

  async getRetailerLedger(req: AuthenticatedRequest, res: Response) {
    if (!req.tenantId) throw new ForbiddenError('No tenant context found');
    const tenantId = req.tenantId;
    
    const { retailerId } = req.params;
    this.validateUUID(retailerId, 'Retailer ID');

    // Check if retailer exists
    const retailer = await this.ledgerModel.getRetailerById(tenantId, retailerId);
    this.ensureResourceExists(retailer, 'Retailer');

    const ledger = await this.ledgerModel.getRetailerLedger(tenantId, retailerId);
    res.json(ledger);
  }

  async getUdhaaarBook(req: AuthenticatedRequest, res: Response) {
    if (!req.tenantId) throw new ForbiddenError('No tenant context found');
    const tenantId = req.tenantId;
    
    const udhaaarBook = await this.ledgerModel.getUdhaaarBook(tenantId);
    res.json(udhaaarBook);
  }

  async getCrateLedger(req: AuthenticatedRequest, res: Response) {
    if (!req.tenantId) throw new ForbiddenError('No tenant context found');
    const tenantId = req.tenantId;
    
    const { retailerId } = req.query;
    
    // If retailerId is provided, validate UUID format and existence
    if (retailerId) {
      this.validateUUID(retailerId as string, 'Retailer ID');
      const retailer = await this.ledgerModel.getRetailerById(tenantId, retailerId as string);
      this.ensureResourceExists(retailer, 'Retailer');
    }
    
    const crateLedger = await this.ledgerModel.getCrateLedger(tenantId, retailerId as string);
    res.json(crateLedger);
  }

  async getCashbookStatus(req: AuthenticatedRequest, res: Response) {
    if (!req.tenantId) throw new ForbiddenError('No tenant context found');
    const tenantId = req.tenantId;
    
    const latestEntry = await this.ledgerModel.getLatestCashbookEntry(tenantId);
    const hasEntries = latestEntry !== null;
    const currentBalance = await TenantModel.getCashBalance(tenantId);
    
    res.json({
      hasEntries,
      currentBalance
    });
  }
}