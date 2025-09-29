import { ExpenseRouter } from './routes';

// Export configured router instance for easy integration
export const expenseRouter = new ExpenseRouter();

// Export individual components for flexibility
export { ExpenseModel } from './model';
export { ExpenseController } from './controller';
export { ExpenseRouter } from './routes';