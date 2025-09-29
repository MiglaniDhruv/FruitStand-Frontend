import { LedgerRouter } from './routes';

// Export configured router instance for easy integration
export const ledgerRouter = new LedgerRouter();

// Export individual components for flexibility
export { LedgerModel } from './model';
export { LedgerController } from './controller';
export { LedgerRouter } from './routes';