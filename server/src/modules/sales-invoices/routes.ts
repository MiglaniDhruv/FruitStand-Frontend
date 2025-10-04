import { BaseRouter } from '../../utils/base';
import { SalesInvoiceController } from './controller';
import { authenticateToken, validateTenant, attachTenantContext } from '../../middleware/auth';

export class SalesInvoiceRouter extends BaseRouter {
  private salesInvoiceController: SalesInvoiceController;

  constructor() {
    super();
    this.salesInvoiceController = new SalesInvoiceController();
    this.setupRoutes();
  }

  private setupRoutes() {
    // GET /sales-invoices - Get sales invoices (with pagination support)
    this.router.get('/sales-invoices', 
      authenticateToken,
      validateTenant,
      attachTenantContext,
      this.salesInvoiceController.getSalesInvoicesPaginated.bind(this.salesInvoiceController)
    );
    
    this.router.get('/sales-invoices/paginated', 
      authenticateToken,
      validateTenant,
      attachTenantContext,
      this.salesInvoiceController.getSalesInvoicesPaginated.bind(this.salesInvoiceController)
    );

    // GET /sales-invoices/:id - Get a specific sales invoice
    this.router.get('/sales-invoices/:id', 
      authenticateToken,
      validateTenant,
      attachTenantContext,
      this.salesInvoiceController.getSalesInvoice.bind(this.salesInvoiceController)
    );

    // POST /sales-invoices - Create a new sales invoice
    this.router.post('/sales-invoices', 
      authenticateToken,
      validateTenant,
      attachTenantContext,
      this.salesInvoiceController.createSalesInvoice.bind(this.salesInvoiceController)
    );

    // POST /sales-invoices/:id/mark-paid - Mark sales invoice as paid
    this.router.post('/sales-invoices/:id/mark-paid', 
      authenticateToken,
      validateTenant,
      attachTenantContext,
      this.salesInvoiceController.markSalesInvoiceAsPaid.bind(this.salesInvoiceController)
    );

    // PUT /sales-invoices/:id/revert-status - Revert sales invoice status from Paid to Partially Paid/Unpaid
    this.router.put('/sales-invoices/:id/revert-status', 
      authenticateToken,
      validateTenant,
      attachTenantContext,
      this.salesInvoiceController.revertInvoiceStatus.bind(this.salesInvoiceController)
    );

    // POST /sales-invoices/:id/share-link - Create share link for sales invoice
    this.router.post('/sales-invoices/:id/share-link', 
      authenticateToken,
      validateTenant,
      attachTenantContext,
      this.salesInvoiceController.createShareLink.bind(this.salesInvoiceController)
    );

    // DELETE /sales-invoices/:id - Delete a sales invoice
    this.router.delete('/sales-invoices/:id', 
      authenticateToken,
      validateTenant,
      attachTenantContext,
      this.salesInvoiceController.delete.bind(this.salesInvoiceController)
    );
  }
}