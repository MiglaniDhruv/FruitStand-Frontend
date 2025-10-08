import { Request, Response } from 'express';
import { insertExpenseCategorySchema, insertExpenseSchema } from '@shared/schema';
import { BaseController } from '../../utils/base';
import { ExpenseModel } from './model';
import { type AuthenticatedRequest } from '../../types';

export class ExpenseController extends BaseController {
  private expenseModel: ExpenseModel;

  constructor() {
    super();
    this.expenseModel = new ExpenseModel();
  }

  async getAllCategories(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const categories = await this.expenseModel.getExpenseCategories(tenantId);
      res.json(categories);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch expense categories');
    }
  }

  async getCategoryById(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ message: 'Category ID is required' });
      }

      const category = await this.expenseModel.getExpenseCategory(tenantId, id);
      
      if (!category) {
        return this.sendNotFound(res, 'Category not found');
      }

      res.json(category);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch expense category');
    }
  }

  async createCategory(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      
      const validation = insertExpenseCategorySchema.safeParse({ ...req.body, tenantId });
      
      if (!validation.success) {
        return this.sendValidationError(res, validation.error.errors);
      }

      const categoryData = validation.data;
      
      const category = await this.expenseModel.createExpenseCategory(tenantId, categoryData);
      
      res.status(201).json(category);
    } catch (error) {
      this.handleError(res, error, 'Failed to create expense category');
    }
  }

  async updateCategory(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ message: 'Category ID is required' });
      }

      const validation = insertExpenseCategorySchema.partial().safeParse({ ...req.body, tenantId });
      
      if (!validation.success) {
        return this.sendValidationError(res, validation.error.errors);
      }

      const categoryData = validation.data;
      
      const category = await this.expenseModel.updateExpenseCategory(tenantId, id, categoryData);
      
      if (!category) {
        return this.sendNotFound(res, 'Category not found');
      }

      res.json(category);
    } catch (error) {
      this.handleError(res, error, 'Failed to update expense category');
    }
  }

  async deleteCategory(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ message: 'Category ID is required' });
      }

      const deleted = await this.expenseModel.deleteExpenseCategory(tenantId, id);
      
      if (!deleted) {
        return this.sendNotFound(res, 'Category not found');
      }

      return res.status(204).send();
    } catch (error) {
      this.handleError(res, error, 'Failed to delete expense category');
    }
  }

  async getAllExpenses(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      
      // Get pagination options from query parameters
      const opts = this.getPaginationOptions(req.query);
      
      // Get filter parameters
      const categoryId = req.query.categoryId as string | undefined;
      const paymentMode = req.query.paymentMode as string | undefined;
      
      const result = await this.expenseModel.getExpensesPaginated(tenantId, opts, categoryId, paymentMode);
      res.json(result);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch expenses');
    }
  }

  async getExpenseById(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ message: 'Expense ID is required' });
      }

      const expense = await this.expenseModel.getExpense(tenantId, id);
      
      if (!expense) {
        return this.sendNotFound(res, 'Expense not found');
      }

      res.json(expense);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch expense');
    }
  }

  async createExpense(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId!;
      
      const validation = insertExpenseSchema.safeParse({ ...req.body, tenantId });
      
      if (!validation.success) {
        return this.sendValidationError(res, validation.error.errors);
      }

      const expenseData = validation.data;
      
      const expense = await this.expenseModel.createExpense(tenantId, expenseData);
      
      res.status(201).json(expense);
    } catch (error) {
      // Handle validation errors for invalid category/bank account
      if (error instanceof Error && error.message === 'Invalid category') {
        return this.sendValidationError(res, [{ path: ['categoryId'], message: 'Invalid category' }]);
      }
      if (error instanceof Error && error.message === 'Invalid bank account') {
        return this.sendValidationError(res, [{ path: ['bankAccountId'], message: 'Invalid bank account' }]);
      }
      
      this.handleError(res, error, 'Failed to create expense');
    }
  }
}