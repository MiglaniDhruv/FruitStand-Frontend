import { BaseRouter } from '../../utils/base';
import { LedgerController } from './controller';
import { authenticateToken, validateTenant, attachTenantContext } from '../../middleware/auth';
import { asyncHandler } from "../../utils/async-handler";

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
      asyncHandler(validateTenant),
      attachTenantContext,
      this.ah(this.ledgerController, 'getVendorLedger')
    );

    // GET /cashbook - Get cashbook entries
    this.router.get('/cashbook', 
      authenticateToken, 
      asyncHandler(validateTenant),
      attachTenantContext,
      this.ah(this.ledgerController, 'getCashbook')
    );

    // GET /bankbook - Get bankbook entries (with optional bankAccountId filter)
    this.router.get('/bankbook', 
      authenticateToken, 
      asyncHandler(validateTenant),
      attachTenantContext,
      this.ah(this.ledgerController, 'getBankbook')
    );

    // GET /ledgers/retailer/:retailerId - Get retailer ledger
    this.router.get('/ledgers/retailer/:retailerId', 
      authenticateToken, 
      asyncHandler(validateTenant),
      attachTenantContext,
      this.ah(this.ledgerController, 'getRetailerLedger')
    );

    // GET /ledgers/udhaar - Get udhaar book
    this.router.get('/ledgers/udhaar', 
      authenticateToken, 
      asyncHandler(validateTenant),
      attachTenantContext,
      this.ah(this.ledgerController, 'getUdhaaarBook')
    );

    // GET /ledgers/crates - Get crate ledger (with optional retailerId filter)
    this.router.get('/ledgers/crates', 
      authenticateToken, 
      asyncHandler(validateTenant),
      attachTenantContext,
      this.ah(this.ledgerController, 'getCrateLedger')
    );

    // GET /ledgers/cashbook/status - Get cashbook status
    this.router.get('/ledgers/cashbook/status', 
      authenticateToken, 
      asyncHandler(validateTenant),
      attachTenantContext,
      this.ah(this.ledgerController, 'getCashbookStatus')
    );
  }
}