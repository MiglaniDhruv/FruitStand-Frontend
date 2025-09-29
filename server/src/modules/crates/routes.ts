import { BaseRouter } from '../../utils/base';
import { CrateController } from './controller';
import { authenticateToken, validateTenant, attachTenantContext } from '../../middleware/auth';

export class CrateRouter extends BaseRouter {
  private crateController: CrateController;

  constructor() {
    super();
    this.crateController = new CrateController();
    this.setupRoutes();
  }

  private setupRoutes() {
    // GET /crate-transactions - Get crate transactions (with pagination support and filtering)
    this.router.get('/crate-transactions', 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.crateController.getAll.bind(this.crateController)
    );

    // GET /crate-transactions/retailer/:retailerId - Get crate transactions by retailer
    this.router.get('/crate-transactions/retailer/:retailerId', 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.crateController.getByRetailer.bind(this.crateController)
    );

    // POST /crate-transactions - Create a new crate transaction
    this.router.post('/crate-transactions', 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.crateController.create.bind(this.crateController)
    );
  }
}