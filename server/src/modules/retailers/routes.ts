import { BaseRouter } from '../../utils/base';
import { RetailerController } from './controller';
import { authenticateToken, validateTenant, attachTenantContext } from '../../middleware/auth';

export class RetailerRouter extends BaseRouter {
  private retailerController: RetailerController;

  constructor() {
    super();
    this.retailerController = new RetailerController();
    this.setupRoutes();
  }

  private setupRoutes() {
    // GET /retailers - Get retailers (with pagination support)
    this.router.get('/retailers', 
      authenticateToken,
      validateTenant,
      attachTenantContext,
      this.retailerController.getAll.bind(this.retailerController)
    );

    // GET /retailers/stats - Get retailer statistics
    this.router.get('/retailers/stats',
      authenticateToken,
      validateTenant,
      attachTenantContext,
      this.retailerController.getStats.bind(this.retailerController)
    );

    // GET /retailers/:id - Get a specific retailer
    this.router.get('/retailers/:id', 
      authenticateToken,
      validateTenant,
      attachTenantContext,
      this.retailerController.getById.bind(this.retailerController)
    );

    // POST /retailers - Create a new retailer
    this.router.post('/retailers', 
      authenticateToken,
      validateTenant,
      attachTenantContext,
      this.retailerController.create.bind(this.retailerController)
    );

    // PUT /retailers/:id - Update a retailer
    this.router.put('/retailers/:id', 
      authenticateToken,
      validateTenant,
      attachTenantContext,
      this.retailerController.update.bind(this.retailerController)
    );

    // DELETE /retailers/:id - Delete a retailer (soft delete)
    this.router.delete('/retailers/:id', 
      authenticateToken,
      validateTenant,
      attachTenantContext,
      this.retailerController.delete.bind(this.retailerController)
    );

    // POST /retailers/:id/payments - Record retailer payment
    this.router.post('/retailers/:id/payments',
      authenticateToken,
      validateTenant,
      attachTenantContext,
      this.retailerController.recordPayment.bind(this.retailerController)
    );

    // GET /retailers/:id/outstanding-invoices - Get outstanding invoices
    this.router.get('/retailers/:id/outstanding-invoices',
      authenticateToken,
      validateTenant,
      attachTenantContext,
      this.retailerController.getOutstandingInvoices.bind(this.retailerController)
    );
  }
}