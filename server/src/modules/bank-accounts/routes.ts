import { BaseRouter } from '../../utils/base';
import { BankAccountController } from './controller';
import { authenticateToken, requireRole, validateTenant, attachTenantContext } from '../../middleware/auth';
import { UserRole } from '../../types';

export class BankAccountRouter extends BaseRouter {
  private bankAccountController: BankAccountController;

  constructor() {
    super();
    this.bankAccountController = new BankAccountController();
    this.setupRoutes();
  }

  private setupRoutes() {
    // GET /bank-accounts - List bank accounts with pagination support
    this.router.get('/bank-accounts', 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.bankAccountController.getAll.bind(this.bankAccountController)
    );

    // GET /bank-accounts/:id - Get bank account by ID
    this.router.get('/bank-accounts/:id', 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.bankAccountController.getById.bind(this.bankAccountController)
    );

    // POST /bank-accounts - Create new bank account
    this.router.post('/bank-accounts', 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      requireRole([UserRole.ADMIN, UserRole.OPERATOR]),
      this.bankAccountController.create.bind(this.bankAccountController)
    );

    // PUT /bank-accounts/:id - Update bank account
    this.router.put('/bank-accounts/:id', 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      requireRole([UserRole.ADMIN, UserRole.OPERATOR]),
      this.bankAccountController.update.bind(this.bankAccountController)
    );

    // DELETE /bank-accounts/:id - Delete bank account (Admin only)
    this.router.delete('/bank-accounts/:id', 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      requireRole([UserRole.ADMIN]),
      this.bankAccountController.delete.bind(this.bankAccountController)
    );
  }
}