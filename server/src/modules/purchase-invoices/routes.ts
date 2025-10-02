import { BaseRouter } from '../../utils/base';
import { PurchaseInvoiceController } from './controller';
import { authenticateToken, requireRole, validateTenant, attachTenantContext } from '../../middleware/auth';
import { UserRole } from '../../types';

export class PurchaseInvoiceRouter extends BaseRouter {
  private purchaseInvoiceController: PurchaseInvoiceController;

  constructor() {
    super();
    this.purchaseInvoiceController = new PurchaseInvoiceController();
    this.setupRoutes();
  }

  private setupRoutes() {
    // GET /purchase-invoices - Get purchase invoices (with pagination support and filtering)
    this.router.get('/purchase-invoices', 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.purchaseInvoiceController.getAll.bind(this.purchaseInvoiceController)
    );

    // GET /purchase-invoices/:id - Get a specific purchase invoice
    this.router.get('/purchase-invoices/:id', 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.purchaseInvoiceController.getById.bind(this.purchaseInvoiceController)
    );

    // POST /purchase-invoices - Create a new purchase invoice (Admin/Operator only)
    this.router.post('/purchase-invoices', 
      authenticateToken,
      validateTenant,
      attachTenantContext,
      requireRole([UserRole.ADMIN, UserRole.OPERATOR]), 
      this.purchaseInvoiceController.create.bind(this.purchaseInvoiceController)
    );

    // POST /purchase-invoices/:id/share-link - Create share link for purchase invoice
    this.router.post('/purchase-invoices/:id/share-link', 
      authenticateToken,
      validateTenant,
      attachTenantContext,
      requireRole([UserRole.ADMIN, UserRole.OPERATOR]), 
      this.purchaseInvoiceController.createShareLink.bind(this.purchaseInvoiceController)
    );
  }
}