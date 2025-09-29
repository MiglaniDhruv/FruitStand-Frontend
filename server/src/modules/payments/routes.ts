import { BaseRouter } from '../../utils/base';
import { PaymentController } from './controller';
import { authenticateToken, requireRole, validateTenant, attachTenantContext } from '../../middleware/auth';
import { UserRole } from '../../types';

export class PaymentRouter extends BaseRouter {
  private paymentController: PaymentController;

  constructor() {
    super();
    this.paymentController = new PaymentController();
    this.setupRoutes();
  }

  private setupRoutes() {
    // GET /payments - Get all payments
    this.router.get('/payments', 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.paymentController.getAll.bind(this.paymentController)
    );

    // GET /payments/invoice/:invoiceId - Get payments by invoice
    this.router.get('/payments/invoice/:invoiceId', 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.paymentController.getByInvoice.bind(this.paymentController)
    );

    // POST /payments - Create a new payment (Admin/Accountant/Operator only)
    this.router.post('/payments', 
      authenticateToken,
      validateTenant,
      attachTenantContext,
      requireRole([UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.OPERATOR]), 
      this.paymentController.create.bind(this.paymentController)
    );
  }
}