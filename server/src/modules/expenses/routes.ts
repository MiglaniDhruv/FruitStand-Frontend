import { BaseRouter } from '../../utils/base';
import { ExpenseController } from './controller';
import { authenticateToken, validateTenant, attachTenantContext } from '../../middleware/auth';

export class ExpenseRouter extends BaseRouter {
  private expenseController: ExpenseController;

  constructor() {
    super();
    this.expenseController = new ExpenseController();
    this.setupRoutes();
  }

  private setupRoutes() {
    // Expense category routes  
    // GET /expense-categories - Get all expense categories
    this.router.get('/expense-categories', 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.expenseController.getAllCategories.bind(this.expenseController)
    );

    // GET /expense-categories/:id - Get a specific expense category
    this.router.get('/expense-categories/:id', 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.expenseController.getCategoryById.bind(this.expenseController)
    );

    // POST /expense-categories - Create a new expense category
    this.router.post('/expense-categories', 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.expenseController.createCategory.bind(this.expenseController)
    );

    // PUT /expense-categories/:id - Update an expense category
    this.router.put('/expense-categories/:id', 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.expenseController.updateCategory.bind(this.expenseController)
    );

    // DELETE /expense-categories/:id - Delete an expense category (soft delete)
    this.router.delete('/expense-categories/:id', 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.expenseController.deleteCategory.bind(this.expenseController)
    );

    // Expense routes
    // GET /expenses - Get all expenses
    this.router.get('/expenses', 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.expenseController.getAllExpenses.bind(this.expenseController)
    );

    // GET /expenses/:id - Get a specific expense
    this.router.get('/expenses/:id', 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.expenseController.getExpenseById.bind(this.expenseController)
    );

    // POST /expenses - Create a new expense
    this.router.post('/expenses', 
      authenticateToken, 
      validateTenant,
      attachTenantContext,
      this.expenseController.createExpense.bind(this.expenseController)
    );
  }
}