import { BaseRouter } from '../../utils/base';
import { SalesPaymentController } from './controller';
import { authenticateToken, validateTenant, attachTenantContext } from '../../middleware/auth';

export class SalesPaymentRouter extends BaseRouter {
  private salesPaymentController: SalesPaymentController;

  constructor() {
    super();
    this.salesPaymentController = new SalesPaymentController();
    this.setupRoutes();
  }

  private setupRoutes() {
    // GET /sales-payments - Get all sales payments
    this.router.get('/sales-payments', 
      authenticateToken,
      validateTenant,
      attachTenantContext,
      this.salesPaymentController.getSalesPayments.bind(this.salesPaymentController)
    );

    // GET /sales-payments/invoice/:invoiceId - Get sales payments by invoice
    this.router.get('/sales-payments/invoice/:invoiceId', 
      authenticateToken,
      validateTenant,
      attachTenantContext,
      this.salesPaymentController.getSalesPaymentsByInvoice.bind(this.salesPaymentController)
    );

    // POST /sales-payments - Create a new sales payment
    this.router.post('/sales-payments', 
      authenticateToken,
      validateTenant,
      attachTenantContext,
      this.salesPaymentController.createSalesPayment.bind(this.salesPaymentController)
    );
  }
}