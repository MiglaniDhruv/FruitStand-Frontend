import { BaseRouter } from '../../utils/base';
import { PurchaseInvoiceController } from './controller';
import { authenticateToken, requireRole, validateTenant, attachTenantContext } from '../../middleware/auth';
import { UserRole } from '../../types';
import { asyncHandler } from "../../utils/async-handler";

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
      asyncHandler(validateTenant),
      attachTenantContext,
      this.ah(this.purchaseInvoiceController, 'getAll')
    );

    // GET /purchase-invoices/:id - Get a specific purchase invoice
    this.router.get('/purchase-invoices/:id', 
      authenticateToken, 
      asyncHandler(validateTenant),
      attachTenantContext,
      this.ah(this.purchaseInvoiceController, 'getById')
    );

    // POST /purchase-invoices - Create a new purchase invoice (Admin/Operator only)
    this.router.post('/purchase-invoices', 
      authenticateToken,
      asyncHandler(validateTenant),
      attachTenantContext,
      asyncHandler(requireRole([UserRole.ADMIN, UserRole.OPERATOR])), 
      this.ah(this.purchaseInvoiceController, 'create')
    );

    // POST /purchase-invoices/:id/share-link - Create share link for purchase invoice
    this.router.post('/purchase-invoices/:id/share-link', 
      authenticateToken,
      asyncHandler(validateTenant),
      attachTenantContext,
      asyncHandler(requireRole([UserRole.ADMIN, UserRole.OPERATOR])), 
      this.ah(this.purchaseInvoiceController, 'createShareLink')
    );

    // DELETE /purchase-invoices/:id - Delete a purchase invoice (Admin/Operator only)
    this.router.delete('/purchase-invoices/:id', 
      authenticateToken,
      asyncHandler(validateTenant),
      attachTenantContext,
      asyncHandler(requireRole([UserRole.ADMIN, UserRole.OPERATOR])), 
      this.ah(this.purchaseInvoiceController, 'delete')
    );
  }
}