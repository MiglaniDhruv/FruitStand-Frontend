import { BankAccountRouter } from './routes';

// Export configured router instance for easy integration
export const bankAccountRouter = new BankAccountRouter();

// Export individual components for flexibility
export { BankAccountModel } from './model';
export { BankAccountController } from './controller';
export { BankAccountRouter } from './routes';