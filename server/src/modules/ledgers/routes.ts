import { BaseRouter } from '../../utils/base';
import { LedgerController } from './controller';
import { authenticateToken, validateTenant, attachTenantContext } from '../../middleware/auth';

export class LedgerRouter extends BaseRouter {
  private ledgerController: LedgerController;

  constructor() {
    super();
    this.ledgerController = new LedgerController();
    this.setupRoutes();
  }

  private setupRoutes() {
    // GET /ledger/vendor/:vendorId - Get vendor ledger
    this.router.get('/ledger/vendor/:vendorId', 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.ledgerController.getVendorLedger.bind(this.ledgerController)
    );

    // GET /cashbook - Get cashbook entries
    this.router.get('/cashbook', 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.ledgerController.getCashbook.bind(this.ledgerController)
    );

    // GET /bankbook - Get bankbook entries (with optional bankAccountId filter)
    this.router.get('/bankbook', 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.ledgerController.getBankbook.bind(this.ledgerController)
    );

    // GET /ledgers/retailer/:retailerId - Get retailer ledger
    this.router.get('/ledgers/retailer/:retailerId', 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.ledgerController.getRetailerLedger.bind(this.ledgerController)
    );

    // GET /ledgers/udhaar - Get udhaar book
    this.router.get('/ledgers/udhaar', 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.ledgerController.getUdhaaarBook.bind(this.ledgerController)
    );

    // GET /ledgers/crates - Get crate ledger (with optional retailerId filter)
    this.router.get('/ledgers/crates', 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.ledgerController.getCrateLedger.bind(this.ledgerController)
    );
  }
}